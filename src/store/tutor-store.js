"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fetchStatus, isAbortError, requestFollowUp, requestLesson } from "@/lib/api-client";
import { LIMITS } from "@/lib/lesson/constants";

const HISTORY_LIMIT = 8;

let lessonController = null;
let followUpController = null;

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyLessonState = {
  lesson: null,
  lessonMeta: null,
  lessonId: null,
  error: null,
  board: { kind: "lesson" },
  conversation: [],
  followUpStatus: "idle", // idle | pending
  panelTab: "lesson",
};

export const useTutorStore = create(
  persist(
    (set, get) => ({
      view: "home", // home | workspace
      status: "idle",
      topic: "",
      ...emptyLessonState,
      history: [],
      aiConfigured: true,
      daily: null,

      async loadStatus() {
        try {
          const s = await fetchStatus();
          set({ aiConfigured: Boolean(s?.ai?.configured), daily: s?.daily ?? null });
        } catch {}
      },

      async startLesson(rawTopic) {
        const topic = String(rawTopic || "").trim().slice(0, LIMITS.topicMaxChars);
        if (!topic) return;
        lessonController?.abort();
        followUpController?.abort();

        const { daily } = get();
        if (daily && daily.remaining <= 0 && new Date(daily.resetsAt) > new Date()) {
          set({
            view: "workspace",
            status: "error",
            topic,
            ...emptyLessonState,
            error: { code: "DAILY_LIMIT", message: "You've used all of today's chalk." },
          });
          return;
        }

        const controller = new AbortController();
        lessonController = controller;

        set({ view: "workspace", status: "generating", topic, ...emptyLessonState });

        try {
          const { lesson, meta, daily: nextDaily } = await requestLesson(topic, { signal: controller.signal });
          if (lessonController !== controller) return; // superseded by a newer request
          const id = uid();
          set({ status: "ready", lesson, lessonMeta: meta, lessonId: id, daily: nextDaily ?? get().daily });
          get().addToHistory({ id, topic, lesson, meta });
        } catch (error) {
          if (lessonController !== controller) return;
          if (isAbortError(error)) return;
          set({
            status: "error",
            error: { code: error.code || "UNKNOWN", message: error.message || "Lesson generation failed." },
            ...(error.daily !== undefined ? { daily: error.daily } : {}),
          });
        } finally {
          if (lessonController === controller) lessonController = null;
        }
      },

      cancelGeneration() {
        lessonController?.abort();
        lessonController = null;
        set({ view: "home", status: "idle", ...emptyLessonState });
      },

      retry() {
        const { topic } = get();
        if (topic) get().startLesson(topic);
      },

      goHome() {
        lessonController?.abort();
        followUpController?.abort();
        lessonController = null;
        set({ view: "home", status: "idle", topic: "", ...emptyLessonState });
      },

      openFromHistory(id) {
        const entry = get().history.find((h) => h.id === id);
        if (!entry) return;
        lessonController?.abort();
        followUpController?.abort();
        set({
          view: "workspace",
          status: "ready",
          topic: entry.topic,
          ...emptyLessonState,
          lesson: entry.lesson,
          lessonMeta: entry.meta,
          lessonId: entry.id,
        });
      },

      removeFromHistory(id) {
        set({ history: get().history.filter((h) => h.id !== id) });
      },

      addToHistory({ id, topic, lesson, meta }) {
        const entry = {
          id,
          topic,
          title: lesson.title,
          createdAt: Date.now(),
          lesson,
          meta: meta ? { provider: meta.provider, model: meta.model } : null,
        };
        const rest = get().history.filter(
          (h) => h.topic.toLowerCase() !== topic.toLowerCase()
        );
        set({ history: [entry, ...rest].slice(0, HISTORY_LIMIT) });
      },

      async askFollowUp(rawQuestion, segmentIndex = 0) {
        const question = String(rawQuestion || "").trim().slice(0, LIMITS.questionMaxChars);
        const { lesson, conversation, followUpStatus } = get();
        if (!question || !lesson || followUpStatus === "pending") return;

        const controller = new AbortController();
        followUpController = controller;
        const learnerTurn = { id: uid(), role: "learner", content: question };
        const pendingTurn = { id: uid(), role: "tutor", content: "", status: "pending", question };
        const history = conversation
          .filter((t) => t.status !== "pending" && t.status !== "error")
          .map(({ role, content }) => ({ role, content }));

        set({ conversation: [...conversation, learnerTurn, pendingTurn], followUpStatus: "pending" });

        const update = (patch) =>
          set({
            conversation: get().conversation.map((t) => (t.id === pendingTurn.id ? { ...t, ...patch } : t)),
          });

        try {
          const { answer } = await requestFollowUp(
            { question, lesson, segmentIndex, history },
            { signal: controller.signal }
          );
          if (followUpController !== controller) return;
          update({
            content: answer.text,
            visualActions: answer.visualActions,
            suggestions: answer.suggestions,
            estimatedDuration: answer.estimatedDuration,
            segmentIndex,
            status: "done",
          });
          if (answer.visualActions?.length) {
            set({ board: { kind: "answer", messageId: pendingTurn.id } });
          }
        } catch (error) {
          if (followUpController !== controller || isAbortError(error)) return;
          update({ status: "error", content: error.message || "The tutor couldn't answer that." });
          if (error.daily !== undefined) set({ daily: error.daily });
        } finally {
          if (followUpController === controller) {
            followUpController = null;
            set({ followUpStatus: "idle" });
          }
        }
      },

      retryFollowUp(messageId, segmentIndex) {
        const turn = get().conversation.find((t) => t.id === messageId);
        if (!turn?.question) return;
        const idx = get().conversation.findIndex((t) => t.id === messageId);
        set({ conversation: get().conversation.filter((_, i) => i !== idx && i !== idx - 1) });
        get().askFollowUp(turn.question, segmentIndex);
      },

      setPanelTab(panelTab) {
        set({ panelTab });
      },

      showAnswerOnBoard(messageId) {
        set({ board: { kind: "answer", messageId } });
      },
      showLessonBoard(seekTo) {
        set({ board: { kind: "lesson", seekTo: Number.isInteger(seekTo) ? seekTo : undefined } });
      },
    }),
    {
      name: "chalk-history",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ history: state.history }),
      skipHydration: true,
    }
  )
);
