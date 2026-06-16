'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  name: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ComponentErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name}]`, error)
    console.error(`[ErrorBoundary:${this.props.name}] ComponentStack:`, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <p className="text-destructive font-bold text-lg mb-2">Error en {this.props.name}</p>
          <p className="text-sm text-muted-foreground mb-4">{this.state.error?.message}</p>
          <pre className="text-xs text-muted-foreground/70 bg-muted p-3 rounded-lg max-w-full overflow-auto max-h-48 text-left">
            {this.state.error?.stack?.split('\n').slice(0, 10).join('\n')}
          </pre>
          <button
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
