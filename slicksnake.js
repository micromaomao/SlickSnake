'use strict'

function normalDist(mean, sd) {
  let u = 1 - Math.random();
  let v = 1 - Math.random();
  let nDist = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); // mean 0 sd 1
  return nDist * sd + mean
}

class Point {
  constructor () {
    this.x = this.y = 0
    this.radius = 3
    this.color = Point.getColor()
    this._appearAnimationTime = Date.now() + Math.floor(Math.random() * 300)
  }
  render (container) {
    let appearProgress = Math.min(Date.now() - this._appearAnimationTime, 600) / 600
    let halfAppearProgress = Math.min(appearProgress * 2, 1)
    let circ = new PIXI.Graphics()
    circ.clear()
    circ.beginFill(this.color, halfAppearProgress * 0.85)
    circ.drawCircle(0, 0, this.radius * halfAppearProgress)
    circ.endFill()
    if (appearProgress < 1) {
      let drawLinesBetween = (a, b) => {
        let step = Math.PI * 2 / 7
        for (let angle = 0; angle <= 2 * Math.PI; angle += step) {
          let x1 = Math.cos(angle) * a
          let y1 = Math.sin(angle) * a
          let x2 = Math.cos(angle) * b
          let y2 = Math.sin(angle) * b
          circ.moveTo(x1, y1)
          circ.lineTo(x2, y2)
        }
      }
      circ.lineStyle(2, 0xffa500)
      if (halfAppearProgress < 1) {
        drawLinesBetween(-this.radius - 5, -this.radius - 5 - halfAppearProgress * 15)
      } else {
        let nextHalf = appearProgress * 2 - 1
        drawLinesBetween(-this.radius - 5 - 15, -this.radius - 5 - nextHalf * 15)
      }
      circ.lineStyle(0, 0, 0)
    }
    container.addChild(circ)
  }
  static getColor () {
    return Math.floor(Math.random() * 127) * Math.pow(256, 2)
      + Math.floor(Math.random() * 127) * 256
      + Math.floor(Math.random() * 127)
  }
}
class Snake {
  constructor (x, y) {
    this.bodies = [[x, y]]
    this.headHistory = []
    this._destVelocity = [80, 0]
    this._currentVelocity = this._destVelocity
    this._lastTime = null
    this.oweingBodies = 5
    this.color = Point.getColor()
    this.color2 = this.color + 0x7f7f7f
    this.headColor = 0x7f7f7f - this.color
    this.radius = 7
    this.vision = 500
  }
  get dead () {
    return this.bodies.length === 0
  }
  get x () {
    if (this.dead) {
      throw new Error('Dead.')
    }
    return this.bodies[0][0]
  }
  get y () {
    if (this.dead) {
      throw new Error('Dead.')
    }
    return this.bodies[0][1]
  }
  get velocity () {
    return this._currentVelocity
  }
  get speed () {
    return Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2))
  }
  set velocity(v) {
    this._destVelocity = v
  }
  get accMag () {
    return this.radius * 10
  }
  get accAng () {
    return Math.PI * 2
  }
  game (visionPoints) {
    if (visionPoints.length === 0) {
      this.targetAt(0, 0)
      return
    }
    let best = visionPoints[0]
    let calcCost = point => {
      let distance = Math.sqrt(Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2))
      return distance / Math.pow(point.radius, 2)
    }
    let minCost = calcCost(best)
    visionPoints.forEach(point => {
      let dis = calcCost(point)
      if (dis < minCost) {
        minCost = dis
        best = point
      }
    })
    this.targetAt(best.x, best.y)
  }
  targetAt(x, y) {
    let angle = Math.atan2(y - this.y, x - this.x)
    let speed = this.speed
    this.velocity = [Math.cos(angle) * speed, Math.sin(angle) * speed]
  }
  update () {
    if (!this.dead) {
      let udt = 0
      if (this._lastTime !== null) {
        udt = ( Date.now() - this._lastTime ) / 1000
      }
      if (udt > 0.1) {
        udt = 0.1
      }
      this._lastTime = Date.now()

      let currentMag = Math.sqrt(Math.pow(this._currentVelocity[0], 2) + Math.pow(this._currentVelocity[1], 2))
      let currentAng = Math.atan2(this._currentVelocity[1], this._currentVelocity[0])
      let destMag = Math.sqrt(Math.pow(this._destVelocity[0], 2) + Math.pow(this._destVelocity[1], 2))
      let destAng = Math.atan2(this._destVelocity[1], this._destVelocity[0])

      let dAng = destAng - currentAng
      if (Math.abs(dAng) >= this.accAng * udt) {
        dAng = Math.sign(dAng) * this.accAng * udt
      }
      let dMag = destMag - currentMag
      if (Math.abs(dMag) >= this.accMag * udt) {
        dMag = Math.sign(dMag) * this.accMag * udt
      }
      let nAng = currentAng + dAng
      let nMag = currentMag + dMag
      this._currentVelocity = [Math.cos(nAng) * nMag, Math.sin(nAng) * nMag]

      let maxTime = this.radius / 6 / this.speed

      if (udt <= maxTime) {
        this._update_dt(udt)
      } else {
        for (let t = 0; t <= udt; t += maxTime) {
          if (t + maxTime > udt) {
            let ndt = udt % maxTime
            this._update_dt(ndt)
          } else {
            this._update_dt(maxTime)
          }
        }
      }
    }
  }
  _update_dt (dt) {
    let [ohx, ohy] = this.bodies[0]
    let nhx = ohx + this.velocity[0] * dt
    let nhy = ohy + this.velocity[1] * dt

    this.headHistory.splice(0, 0, [nhx, nhy])
    let brp = 0
    for (let i = 0; i < this.bodies.length;) {
      this.bodies[i] = this.headHistory[Math.max(0, brp - 1)]
      if (i > 0) {
        if (brp >= this.headHistory.length - 1 ||
          Math.sqrt(Math.pow(this.bodies[i][0] - this.bodies[i-1][0], 2) + Math.pow(this.bodies[i][1] - this.bodies[i-1][1], 2))
            > this.radius * 1.5) {
          if (brp >= this.headHistory.length - 1 && this.bodies.length - 1 !== i) {
            let bodiesLeft = this.bodies.length - 1 - i
            this.oweingBodies += bodiesLeft
            this.bodies.splice(i + 1, bodiesLeft)
            break
          }
          i ++
        }
      } else {
        i ++
      }
      brp++
    }
    brp --
    if (this.headHistory.length > brp) {
      if (this.oweingBodies <= 0) {
        this.headHistory.splice(brp)
        this.oweingBodies = 0
      } else if (this.oweingBodies >= 1) {
        let nBodyPosition = this.headHistory[this.headHistory.length - 1]
        let lBodyPosition = this.bodies[this.bodies.length - 1]
        if (Math.sqrt(Math.pow(nBodyPosition[0] - lBodyPosition[0], 2) + Math.pow(nBodyPosition[1] - lBodyPosition[1], 2)) >= this.radius * 1.5) {
          this.oweingBodies --
          this.bodies.push(nBodyPosition)
        }
      }
    }
  }
  render (container) {
    for (let i = this.bodies.length - 1; i >= 0; i --) {
      let even = i % 2 === 0
      let body = this.bodies[i]
      let circ = new PIXI.Graphics()
      circ.clear()
      let color = even ? this.color2 : this.color
      if (i === 0) {
        color = this.headColor
      }
      circ.beginFill(color)
      circ.drawCircle(0, 0, this.radius)
      circ.endFill()
      circ.x = body[0]
      circ.y = body[1]
      container.addChild(circ)
    }
  }
}

class SnakeGame {
  constructor (stage) {
    this._stage = stage
    this._width = this._height = this._x = this._y = 0
    this._scene = 'play'
    this._updateHooks = []
    this._gridSpace = 30

    this._contentRemoveList = new Set()

    this._worldContainer = new PIXI.Container()
    this._buildWorld(this._worldContainer)
    this._stage.addChild(this._worldContainer)
    this._welcomeContainer = new PIXI.Container()
    this._buildWelcome(this._welcomeContainer)
    this._stage.addChild(this._welcomeContainer)

    this._renderMap = new WeakMap()

    this._pointsBush = rbush()
    this._snakesBush = rbush()
    this._snakes = []
    let nextPointGen = 0
    this._addUpdateHook((vw, vh) => {
      if (this._scene === 'play' && Date.now() >= nextPointGen) {
        if (normalDist(this._pointsBush.all().length, 300) < 0) {
          this.newLittlePoint()
        }
        if (normalDist(this._snakes.length, 10) < 0) {
          this.newSnake()
        }
        nextPointGen = Date.now() + 20
      }
    })
    this._addUpdateHook((vw, vh) => {
      this._snakes.forEach(snake => {
        let visionSearch = {minX: snake.x - snake.vision, minY: snake.y - snake.vision,
          maxX: snake.x + snake.vision, maxY: snake.y + snake.vision}
        let visionPoints = this._pointsBush.search(visionSearch)
        let visionBodies = this._snakesBush.search(visionSearch)
        snake.game(visionPoints.map(point => point.pts), visionBodies)
      })
    })
  }

  get scene () {
    return this._scene
  }
  _buildWelcome (container) {
    let logo = PIXI.Sprite.fromImage('resources/slicklogo.png')
    logo.width = 500
    logo.height = 300
    container.addChild(logo)
    this._addUpdateHook((vw, vh) => {
      logo.x = vw / 2 - 500 / 2
      logo.y = vh / 2 - 300 / 2
    })
  }
  _buildWorld (container) {
    let grid = new PIXI.Graphics()
    let gw = 0
    let gh = 0
    let gs = 0
    this._addUpdateHook((vw, vh) => {
      if (vw !== gw || vh !== gh || this._gridSpace !== gs) {
        gw = vw
        gh = vh
        gs = this._gridSpace

        // Redraw grid
        grid.clear()
        grid.lineStyle(1, 0x6699cc, 0.3)
        // Draw `gs` more pixel because the graph may be offseted.
        for (let y = -gs; y <= gh + gs; y += gs) {
          grid.moveTo(0, y)
          grid.lineTo(gw + gs, y)
        }
        for (let x = -gs; x <= gw + gs; x += gs) {
          grid.moveTo(x, 0)
          grid.lineTo(x, gh + gs)
        }
      }
      grid.x = -this._x % gs - gs
      grid.y = -this._y % gs - gs
    })
    container.addChild(grid)
    let worldContentContainer = new PIXI.Container()
    this._addUpdateHook((vw, vh) => {
      worldContentContainer.x = -this._x
      worldContentContainer.y = -this._y
      this._contentRemoveList.forEach(ch => {
        worldContentContainer.removeChild(ch)
      })
      this._contentRemoveList.clear()
    })
    container.addChild(worldContentContainer)
    this._addUpdateHook((vw, vh) => {
      this._pointsBush.search({minX: this._x, minY: this._y, maxX: this._x + vw, maxY: this._y + vh}).forEach(point => {
        let pts = point.pts
        let cont = this._renderMap.get(pts)
        if (!cont) {
          cont = new PIXI.Container()
          this._renderMap.set(pts, cont)
          worldContentContainer.addChild(cont)
        }
        cont.removeChildren()
        cont.x = pts.x
        cont.y = pts.y
        pts.render(cont)
      })
    })
    this._addUpdateHook((vw, vh) => {
      this._snakes.forEach(snake => {
        snake.update()
        let cont = this._renderMap.get(snake)
        if (!cont) {
          cont = new PIXI.Container()
          this._renderMap.set(snake, cont)
          worldContentContainer.addChild(cont)
        }
        cont.removeChildren()
        snake.render(cont)

        let headSearch = {minX: snake.x - snake.radius * 1.5, minY: snake.y - snake.radius * 1.5,
          maxX: snake.x + snake.radius * 1.5, maxY: snake.y + snake.radius * 1.5}
        let headCollideSearch = {minX: snake.x - snake.radius, minY: snake.y - snake.radius,
          maxX: snake.x + snake.radius, maxY: snake.y + snake.radius}
        let pointsEatten = this._pointsBush.search(headSearch)
        pointsEatten.forEach(point => {
          let pts = point.pts
          let bodyGain = pts.radius / 7
          this.removePoint(point)
          snake.oweingBodies += bodyGain
        })
        let collides = this._snakesBush.search(headCollideSearch)
        collides.forEach(point => {
          if (point.snake !== snake) {
            snake.bodies.forEach(body => {
              let pts = new Point()
              pts.x = body[0]
              pts.y = body[1]
              pts.radius = snake.radius
              this._pointsBush.insert({minX: pts.x, minY: pts.y, maxX: pts.x, maxY: pts.y, pts: pts})
            })
            this.removeSnake(snake)
          }
        })
      })
    })
  }
  resize (w, h) {
    this._width = w
    this._height = h
  }
  update () {
    let vw = this._width
    let vh = this._height
    this._snakesBush.clear()
    let snakeBodies = []
    this._snakes.forEach(snake => {
      Array.prototype.push.apply(snakeBodies, snake.bodies.map(body => { return {x: body[0], y: body[1], radius: snake.radius, snake: snake} }))
    })
    this._snakesBush.load(snakeBodies.map(sbody => {
      return {
        minX: sbody.x - sbody.radius,
        minY: sbody.y - sbody.radius,
        maxX: sbody.x + sbody.radius,
        maxY: sbody.y + sbody.radius,
        snake: sbody.snake
      }
    }))
    this._updateHooks.forEach(f => f(vw, vh))
    this._welcomeContainer.renderable = this.scene === 'welcome'
  }
  _addUpdateHook (...hooks) {
    Array.prototype.push.apply(this._updateHooks, hooks)
  }
  handleKeyPress () {
    if (this.scene === 'welcome' || this.scene === 'pause') {
      this._scene = 'play'
    }
  }
  newLittlePoint () {
    const bound = 700
    let x = normalDist(0, bound)
    let y = normalDist(0, bound)
    let pts = new Point()
    pts.x = x
    pts.y = y
    pts.radius = Math.ceil(Math.random() * 2 + 2)
    this._pointsBush.insert({minX: x, minY: y, maxX: x, maxY: y, pts: pts})
  }
  removePoint (pts) {
    if (pts.pts) {
      this._pointsBush.remove(pts)
      let container = this._renderMap.get(pts.pts)
      this._contentRemoveList.add(container)
      this._renderMap.delete(pts.pts)
    } else {
      this._pointsBush.remove(pts, (pts, point) => {
        if (pts.pts) {
          let t = pts
          pts = point
          point = t
        }
        return point.pts === pts
      })
      let container = this._renderMap.get(pts)
      this._contentRemoveList.add(container)
      this._renderMap.delete(pts)
    }
  }
  removeSnake (snake) {
    let idx = this._snakes.indexOf(snake)
    if (idx < 0) {
      return
    }
    this._snakes.splice(idx, 1)
    let cont = this._renderMap.get(snake)
    this._contentRemoveList.add(cont)
    this._renderMap.delete(snake)
  }
  get viewX () {
    return this._x
  }
  get viewY () {
    return this._y
  }
  move (x, y) {
    this._x += x
    this._y += y
  }
  newSnake () {
    this._snakes.push(new Snake(normalDist(0, 300), normalDist(0, 300)))
  }
}

function bootstrap () {
  let canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    width: '100vw',
    height: '100vh'
  })
  Object.assign(document.body.style, {
    padding: '0',
    margin: '0',
    boxSizing: 'border-box',
    overflow: 'hidden'
  })
  document.body.appendChild(canvas)

  let renderer = PIXI.autoDetectRenderer(0, 0, {
    view: canvas
  })
  renderer.backgroundColor = 0xffffff

  let stage = new PIXI.Container()
  let instance = new SnakeGame(stage)
  
  function doRender () {
    instance.update()
    renderer.render(stage)
  }
  function renderLoop () {
    doRender()
    requestAnimationFrame(renderLoop)
  }
  renderLoop()

  function onResize () {
    let vw = canvas.offsetWidth
    let vh = canvas.offsetHeight
    renderer.resize(vw, vh)
    instance.resize(vw, vh)
    doRender()
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('keypress', instance.handleKeyPress.bind(instance))
  let drag = null
  window.addEventListener('mousedown', evt => {
    if (!drag) {
      drag = [evt.clientX, evt.clientY]
    }
  })
  window.addEventListener('mousemove', evt => {
    if (drag) {
      instance.move(drag[0] - evt.clientX, drag[1] - evt.clientY)
      drag = [evt.clientX, evt.clientY]
    }
  })
  window.addEventListener('mouseup', evt => {
    drag = null
  })
  window.addEventListener('contextmenu', evt => evt.preventDefault())
  window.addEventListener('touchstart', evt => {
    if (!drag && evt.touches.length === 1) {
      let touch = evt.touches[0]
      drag = [touch.clientX, touch.clientY]
    }
  })
  window.addEventListener('touchmove', evt => {
    if (drag && evt.touches.length === 1) {
      let touch = evt.touches[0]
      instance.move(drag[0] - touch.clientX, drag[1] - touch.clientY)
      drag = [touch.clientX, touch.clientY]
    }
  })
  window.addEventListener('touchend', evt => {
    drag = null
  })
  onResize()
}

bootstrap()
