'use strict'

function normalDist(mean, sd) {
  let u = 1 - Math.random();
  let v = 1 - Math.random();
  let nDist = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); // mean 0 sd 1
  return nDist * sd + mean
}

function _trendAngle (currAng, destAng, turnRate) {
  let directTurnDiff = destAng - currAng
  let directTurnCost = Math.abs(directTurnDiff)
  if (directTurnCost <= Math.PI) {
    return currAng + Math.sign(directTurnDiff) * Math.min(directTurnCost, turnRate)
  } else {
    if (destAng > currAng) {
      let reverseTurnCost = currAng + Math.PI * 2 - destAng
      let nAng = currAng - Math.min(reverseTurnCost, turnRate)
      if (nAng >= 0) {
        return nAng
      } else {
        return Math.PI * 2 + nAng
      }
    } else {
      let reverseTurnCost = destAng + Math.PI * 2 - currAng
      return (currAng + Math.min(reverseTurnCost, turnRate)) % (Math.PI * 2)
    }
  }
}
function trendAngle (currAng, destAng, turnRate) {
  // Turn them into sensible form: 0 to 2Pi (0 to 360)
  currAng = (currAng + Math.PI) % (Math.PI * 2)
  destAng = (destAng + Math.PI) % (Math.PI * 2)

  return _trendAngle(currAng, destAng, Math.abs(turnRate)) - Math.PI
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
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('[Snake::constructor] Must provide x and y.')
    }
    this.bodies = [[x, y]]
    this._trail = []
    this._destVelocity = [80, 0]
    this._currentVelocity = this._destVelocity
    this._lastTime = null
    this._lastGameTime = 0
    this.oweingBodies = 5
    this.color = Point.getColor()
    this.color2 = this.color + 0x7f7f7f
    this.headColor = 0x7f7f7f - this.color
    this.radius = 7
    this.securityFactor = this.radius * Math.random() * 10
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
  get velocityMagnitude () {
    return Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2))
  }
  get velocityAngle () {
    return Math.atan2(this.velocity[1], this.velocity[0])
  }
  set velocityMagnitude (destMag) {
    let destAng = Math.atan2(this._destVelocity[1], this._destVelocity[0])
    this.velocity = [Math.cos(destAng) * destMag, Math.sin(destAng) * destMag]
  }
  set velocityAngle (destAng) {
    let destMag = Math.sqrt(Math.pow(this._destVelocity[0], 2) + Math.pow(this._destVelocity[1], 2))
    this.velocity = [Math.cos(destAng) * destMag, Math.sin(destAng) * destMag]
  }
  set velocity(v) {
    this._destVelocity = v
  }
  get accMag () {
    return this.radius * 60
  }
  get accAng () {
    return Math.PI * 4
  }
  game (visionPoints, visionBodies) {
    let visionBodiesBush = rbush()
    let bodiesSearchBound = this.radius + this.securityFactor
    visionBodiesBush.load(visionBodies)
    let _bodiesAroundHead = visionBodiesBush.search({minX: this.x - bodiesSearchBound, minY: this.y - bodiesSearchBound, maxX: this.x + bodiesSearchBound, maxY: this.y + bodiesSearchBound})
    let bodiesAroundHead = []
    _bodiesAroundHead.forEach(body => {
      if (body.snake != this) {
        bodiesAroundHead.push(body)
      }
    })
    if (bodiesAroundHead.length > 0) {
      let angleToTurn = this._findBestAngleToTurn(bodiesAroundHead)
      this.velocity = [Math.cos(angleToTurn) * this.velocityMagnitude, Math.sin(angleToTurn) * this.velocityMagnitude]
      return
    }

    if (visionPoints.length === 0) {
      this.targetAt(0, 0)
      return
    }
    if (Date.now() - this._lastGameTime <= 1000) {
      return
    }
    this._lastGameTime = Date.now()
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
      if (Math.sqrt(Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2)) <= this.radius * 2) {
        this._lastGameTime = Date.now() - 1000
      }
    })
    this.targetAt(best.x, best.y)
  }
  targetAt (x, y) {
    let angle = Math.atan2(y - this.y, x - this.x)
    let speed = this.velocityMagnitude
    this.velocity = [Math.cos(angle) * speed, Math.sin(angle) * speed]
    // FIXME: sine wave trap
  }
  _findBestAngleToTurn (bodiesAroundHead) {
    let angles = bodiesAroundHead.map(bodyBBox => {
      let x = (bodyBBox.minX + bodyBBox.maxX) / 2
      let y = (bodyBBox.minY + bodyBBox.maxY) / 2
      let rx = x - this.x
      let ry = y - this.y
      let angle = Math.atan2(ry, rx)
      return (angle + Math.PI) % (Math.PI * 2)
    }).sort()
    if (angles.length === 0) {
      return null
    } else if (angles.length === 1) {
      return (angles[0] + Math.PI) % (Math.PI * 2) - Math.PI
    }
    let angleDiffs = []
    for (let i = 1; i < angles.length; i ++) {
      angleDiffs.push({diff: angles[i] - angles[i-1], mid: (angles[i] + angles[i-1]) / 2})
    }
    let lastAngle = angles[angles.length - 1]
    let firstAngleContinued = angles[0] + Math.PI * 2
    angleDiffs.push({diff: firstAngleContinued - lastAngle, mid: ((firstAngleContinued + lastAngle) / 2) % (Math.PI * 2)})
    let maxDiff = null
    angleDiffs.forEach(diff => {
      if (maxDiff === null || maxDiff.diff < diff.diff) {
        maxDiff = diff
      }
    })
    return maxDiff.mid - Math.PI
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

      this._updateVelocity(udt) 
      this._updateHeadPosition(udt)
      this._repositionBody()
    }
  }
  _updateVelocity (udt) {
    let currentMag = this.velocityMagnitude
    let currentAng = this.velocityAngle
    let destMag = Math.sqrt(Math.pow(this._destVelocity[0], 2) + Math.pow(this._destVelocity[1], 2))
    let destAng = Math.atan2(this._destVelocity[1], this._destVelocity[0])

    let dMag = destMag - currentMag
    if (Math.abs(dMag) >= this.accMag * udt) {
      dMag = Math.sign(dMag) * this.accMag * udt
    }

    let turnRate = this.accAng * udt
    let nAng = trendAngle(currentAng, destAng, turnRate)
    let nMag = currentMag + dMag
    this._currentVelocity = [Math.cos(nAng) * nMag, Math.sin(nAng) * nMag]
  }
  _updateHeadPosition (udt) {
    let maxTime = this.radius / 3 / this.velocityMagnitude
    let [ohx, ohy] = this.bodies[0]
    let historySplices = []
    // Keep dt small so there won't be gaps between body parts.
    for (let t = 0; t < udt; t += maxTime) {
      let ndt
      if (t + maxTime > udt) {
        ndt = udt % maxTime
      } else {
        ndt = maxTime
      }
      let cdt = t + ndt
      let chx = ohx + this.velocity[0] * cdt
      let chy = ohy + this.velocity[1] * cdt
      historySplices.push([chx, chy])
    }

    // this._trail: [0] present -> pass [length]
    Array.prototype.splice.apply(this._trail, [0, 0, ...(historySplices.reverse())])
    if (this._trail.length === 0) {
      this._trail.push(this.bodies[0])
    }
  }
  _repositionBody () {
    let brp = 0
    for (let i = 0; i < this.bodies.length;) {
      this.bodies[i] = this._trail[Math.max(0, brp - 1)]
      if (i > 0) {
        // Find a suitable position for the body part.
        // A suitable position is the position that don't overlap too much with the previous body,
        // but still touches the previous body. In this case it's the one with the lowest possible
        // distance to the previous body greater than 1.5 * radius.
        if (brp >= this._trail.length - 1 ||
          Math.sqrt(Math.pow(this.bodies[i][0] - this.bodies[i-1][0], 2) + Math.pow(this.bodies[i][1] - this.bodies[i-1][1], 2))
            > this.radius * 1.5) {
          if (brp >= this._trail.length - 1 && this.bodies.length - 1 !== i) {
            // Handle strange case where all body part after are too close together.
            // There will not be body parts too far away because dt is kept small.
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
    if (this._trail.length > brp) {
      if (this.oweingBodies <= 0) {
        // Save memory.
        this._trail.splice(brp)
        this.oweingBodies = 0
      } else if (this.oweingBodies >= 1) {
        let nBodyPosition = this._trail[this._trail.length - 1]
        let lBodyPosition = this.bodies[this.bodies.length - 1]
        // When suitable (i.e. there's enough unused trail to add a new body), add a new body part.
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
        if (normalDist(this._pointsBush.all().length, 700) < 0) {
          this.newLittlePoint()
        }
        if (normalDist(this._snakes.length, 2) < 0) {
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
    this._buildSnakeBush()
    this._updateHooks.forEach(f => f(vw, vh))
    this._welcomeContainer.renderable = this.scene === 'welcome'
  }
  _buildSnakeBush () {
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
  newSnake (snake) {
    snake = snake || new Snake(normalDist(0, 300), normalDist(0, 300))
    this._snakes.push(snake)
    return snake
  }
}

class ControlledSnake extends Snake {
  constructor (x, y) {
    super(x || Math.random() * 500 - 250, y || Math.random() * 500 - 250)
    this._handleKeyDown = this._handleKeyDown.bind(this)
    this._handleKeyUp = this._handleKeyUp.bind(this)
    this._keyMap = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      up: 'ArrowUp',
      down: 'ArrowDown',
      speed: ' '
    }
    this._minSpeed = 80
    this._maxSpeed = this._minSpeed * 3
    this._accelerating = false
    this.turnRate = Math.PI
  }
  get keyMap () {
    return Object.assign({}, this._keyMap)
  }
  set keyMap (x) {
    this._keyMap = x
    this._accelerating = false
    this._updateSpeed()
  }
  get snake () {
    return this._snake
  }
  get currentStateSpeed () {
    return this.accelerating ? this.maxSpeed : this.minSpeed
  }
  set minSpeed (x) {
    this._minSpeed = x
    this._updateSpeed()
  }
  set maxSpeed (x) {
    this._maxSpeed = x
    this._updateSpeed()
  }
  get minSpeed () {
    return this._minSpeed
  }
  get maxSpeed () {
    return this._maxSpeed
  }
  get accelerating () {
    return this._accelerating
  }
  set accelerating (x) {
    this._accelerating = x
    this._updateSpeed()
  }
  _updateSpeed () {
    this.velocityMagnitude = this.currentStateSpeed
  }
  bindEvents (object) {
    object.addEventListener('keydown', this._handleKeyDown)
    object.addEventListener('keyup', this._handleKeyUp)
  }
  _handleKeyDown (evt) {
    let key = evt.key
    console.log(key)
    if (key === this._keyMap.speed && !this.accelerating) {
      this.accelerating = true
    }
    if (key === this._keyMap.up) {
      this.turnToward(0, -1)
    }
    if (key === this._keyMap.down) {
      this.turnToward(0, 1)
    }
    if (key === this._keyMap.left) {
      this.turnToward(-1, 0)
    }
    if (key === this._keyMap.right) {
      this.turnToward(1, 0)
    }
  }
  _handleKeyUp (evt) {
    let key = evt.key
    if (key === this._keyMap.speed && this.accelerating) {
      this.accelerating = false
    }
  }
  game (visionPoints, visionBodies) {
  }
  turnToward (x, y) {
    let angle = Math.atan2(y, x)
    let currAng = this.velocityAngle
    this.velocityAngle = trendAngle(currAng, angle, this.turnRate)
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
  
  function createPlayer (keyMap) {
    let snake = new ControlledSnake()
    snake.keyMap = keyMap
    instance.newSnake(snake)
    snake.bindEvents(window)
  }

  createPlayer({up: 'k', down: 'j', left: 'h', right: 'l', speed: 'i'})
  createPlayer({up: 'w', down: 's', left: 'a', right: 'd', speed: 'x'})
  createPlayer({up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', speed: ' '})
}

bootstrap()
