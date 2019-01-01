import Purview from "../purview"

interface AnimationState {
  visible: boolean
  count: number
  step: number
}

export default class extends Purview.Component<{}, AnimationState> {
  interval: NodeJS.Timer | null = null
  state = { visible: false, count: 0, step: 0.5 }

  componentWillUnmount(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  toggle = () => {
    this.setState(state => {
      if (state.visible) {
        if (this.interval) {
          clearInterval(this.interval)
          this.interval = null
        }
      } else {
        this.interval = setInterval(this.next, 1000 / 60)
      }

      return { visible: !state.visible }
    })
  }
  next = () => this.setState(state => ({ count: state.count + state.step }))
  flip = () => this.setState(state => ({ step: -state.step }))

  render(): JSX.Element {
    const barCount = 80
    const barWidth = 100 / barCount

    const bars = []
    const count = this.state.count

    for (let i = 0; i < barCount; i++) {
      const translateY = Math.sin(count / 10 + i / 5) * 100 * 0.5
      const hue = ((360 / barCount) * i - count) % 360
      const color = "hsl(" + hue + ",95%,55%)"
      const rotation = (count + i) % 360
      const barX = barWidth * i

      const style =
        `width: ${barWidth}%;` +
        `left: ${barX}%;` +
        `transform: scale(0.8,.5) translateY(${translateY}%)` +
        `rotate(${rotation}deg);` +
        `background-color: ${color}`

      bars.push(<div class="bar" style={style} />)
    }

    let wave = null
    if (this.state.visible) {
      wave = (
        <div onClick={this.flip} class="animated-sin-wave">
          {bars}
        </div>
      )
    }

    return (
      <div>
        <button onClick={this.toggle}>Toggle Animation</button>
        {wave}
      </div>
    )
  }
}
