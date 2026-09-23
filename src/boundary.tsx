import { Component, type ReactNode } from 'react'

// A crash in one panel used to blank the whole workspace with no explanation.
// This keeps the shell alive and shows what failed.
type Props = { name: string; children: ReactNode }
type State = { message: string }

export class PanelBoundary extends Component<Props, State> {
  state: State = { message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : 'Something went wrong' }
  }

  componentDidCatch(error: unknown) {
    console.error('[panel]', error)
  }

  render() {
    if (!this.state.message) return this.props.children
    return <div className="error-banner" role="alert">
      <span>{this.props.name} could not be displayed: {this.state.message}</span>
      <button onClick={() => this.setState({ message: '' })}>Retry</button>
    </div>
  }
}
