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
    this._appearAnimationTime = Date.now()
  }
  render (container) {
    let appearProgress = Math.min(Date.now() - this._appearAnimationTime, 600) / 600
    let halfAppearProgress = Math.min(appearProgress * 2, 1)
    let circ = new PIXI.Graphics()
    circ.clear()
    circ.beginFill(this.color, halfAppearProgress)
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

class SnakeGame {
  constructor (stage) {
    this._stage = stage
    this._width = this._height = this._x = this._y = 0
    this._scene = 'welcome'
    this._updateHooks = []
    this._gridSpace = 30

    this._worldContainer = new PIXI.Container()
    this._buildWorld(this._worldContainer)
    this._stage.addChild(this._worldContainer)
    this._welcomeContainer = new PIXI.Container()
    this._buildWelcome(this._welcomeContainer)
    this._stage.addChild(this._welcomeContainer)

    this._points = []
    let nextPointGen = 0
    this._addUpdateHook((vw, vh) => {
      if (this._scene === 'play' && Date.now() >= nextPointGen) {
        if (normalDist(this._points.length, 500) < 0) {
          this.newLittlePoint()
        }
        nextPointGen = Date.now() + 20
      }
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
    })
    container.addChild(worldContentContainer)
    let renderMap = new WeakMap()
    this._addUpdateHook((vw, vh) => {
      this._points.forEach(pts => {
        if (pts.x >= this._x && pts.y >= this._y && pts.x <= this._x + vw && pts.y <= this._y + vh) {
          let cont = renderMap.get(pts)
          if (!cont) {
            cont = new PIXI.Container()
            renderMap.set(pts, cont)
            worldContentContainer.addChild(cont)
          }
          cont.removeChildren()
          cont.x = pts.x
          cont.y = pts.y
          pts.render(cont)
        } else {
          let cont = renderMap.get(pts)
          if (cont) {
            worldContentContainer.removeChild(cont)
            renderMap.delete(pts)
          }
        }
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
    this._points.push(pts)
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
  onResize()
}

bootstrap()
