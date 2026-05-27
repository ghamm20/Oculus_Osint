"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  pluginId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class PluginErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Fix C — surface the caught error with full context. Render still
    // returns null so the rest of the panel keeps working, but the
    // operator gets:
    //   1. A clear log prefix tagging the plugin that crashed
    //   2. The Error object (name, message, stack)
    //   3. The React component stack from errorInfo, which tells us
    //      *where in the plugin's component tree* the throw happened
    //      (previously hidden — only the raw Error was logged).
    // The two-line format keeps the existing log shape stable for
    // anyone grepping logs while adding the componentStack underneath.
    console.error(
      `[PluginErrorBoundary] Plugin component '${this.props.pluginId}' crashed during render and was isolated:`,
      error,
    );
    if (errorInfo?.componentStack) {
      console.error(
        `[PluginErrorBoundary] Component stack for '${this.props.pluginId}':`,
        errorInfo.componentStack,
      );
    }
  }

  public render() {
    if (this.state.hasError) {
      // Return null so the rest of the application can continue running
      return null;
    }

    return this.props.children;
  }
}
