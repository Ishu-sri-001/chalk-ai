"use client";

import { useRef } from "react";
import Captions from "@/components/playback/Captions";
import LiveBoard from "@/components/playback/LiveBoard";
import PlaybackBar from "@/components/playback/PlaybackBar";
import { usePlayerContext, usePlayerState } from "@/components/playback/PlayerProvider";
import AnswerBanner from "@/components/workspace/AnswerBanner";
import LessonComplete from "@/components/workspace/LessonComplete";

export default function LessonStage({ lesson }) {
  const { track } = usePlayerContext();
  const segmentIndex = usePlayerState((s) => s.segmentIndex, 0);
  const isAnswer = track.kind === "answer";
  const stageRef = useRef(null);

  return (
    <div ref={stageRef} className="flex flex-col [&:fullscreen]:overflow-hidden [&:fullscreen]:bg-board">
      <div className="flex w-full flex-col in-[:fullscreen]:h-full">
        <div className="in-[:fullscreen]:px-[2vw]">
          <AnswerBanner track={track} />
        </div>
        <div className="overflow-hidden rounded-2xl border border-board-edge bg-board shadow-(--shadow-board) in-[:fullscreen]:flex in-[:fullscreen]:min-h-0 in-[:fullscreen]:flex-1 in-[:fullscreen]:flex-col in-[:fullscreen]:rounded-none in-[:fullscreen]:border-0 in-[:fullscreen]:shadow-none">
          <LiveBoard
            fullscreenTarget={stageRef}
            label={isAnswer ? `Sketch for your question: ${track.question}` : `${lesson.title}, part ${segmentIndex + 1}`}
          />
          <PlaybackBar fullscreenTarget={stageRef} />
        </div>
        <div className="flex flex-col in-[:fullscreen]:hidden">
          <LessonComplete lesson={lesson} />
          <Captions />
        </div>
      </div>
    </div>
  );
}
