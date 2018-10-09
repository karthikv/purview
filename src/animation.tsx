import Purview from "./purview"

interface AnimationState {
  count: number
  step: number
}

export default class extends Purview.Component<{}, AnimationState> {
  constructor(props: {}) {
    super(props)
    this.state = { count: 0, step: 0.5 }
    setInterval(this.next, 1000 / 60)
  }

  next = () => {
    this.setState(state => ({ count: state.count + state.step }))
  }

  flip = () => {
    this.setState(state => ({ step: -state.step }))
  }

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

    return (
      <div onClick={this.flip} class="animated-sin-wave">
        {bars}
      </div>
    )
  }
}
