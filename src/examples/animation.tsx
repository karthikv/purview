import Purview, { css, JSX } from "../purview"

interface AnimationState {
  visible: boolean
  count: number
  step: number
}

const waveCSS = css({
  position: "relative",
  height: "150px",
  width: "100%",
  overflow: "hidden",
})

const baseBarCSS = css({
  position: "absolute",
  height: "100%",
  borderRadius: "50%",
  maxWidth: "10px",
})

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
    void this.setState(state => {
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

      const barCSS = css({
        width: `${barWidth}%`,
        left: `${barX}%`,
        backgroundColor: color,
      })

      // Don't use Purview's built-in CSS handling for this rule, as it requires too many unique rules for the atomic CSS.
      const transformStyle = `transform: scale(0.8,.5) translateY(${translateY}%) rotate(${rotation}deg);`

      bars.push(<div css={css(baseBarCSS, barCSS)} style={transformStyle} />)
    }

    let wave = null
    if (this.state.visible) {
      wave = (
        <div onClick={this.flip} css={waveCSS}>
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
