"use client";

import { Component } from "react";

export default class ElementBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn(`[whiteboard] skipped a ${this.props.type} that failed to render:`, error?.message);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
