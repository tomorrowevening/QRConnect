import { useEffect, useRef } from 'react'

const url = new URL(import.meta.url)
const USER_IP = url.hostname

interface User {
  color: string
  position: number[]
}

function App() {
  const pRef = useRef<HTMLParagraphElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const p = pRef.current!
    const canvas = canvasRef.current!
    const onResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    onResize()
    window.addEventListener('resize', onResize)

    const ctx = canvas.getContext('2d')!
    const users = new Map<string, User>()

    const connection = {
      connected: false,
      color: '#FF00FF',
      position: [-1, -1],
      host: location.hash.length < 2,
      serverID: '',
      userID: '',
    }
    if (!connection.host) {
      const index = location.hash.search('=') + 1
      connection.serverID = location.hash.slice(index)
    }

    const onOpen = () => {
      connection.connected = true
      p.innerText = `${p.innerText}\nConnection open`
    }

    const onClose = () => {
      connection.connected = false
      p.innerText = `${p.innerText}\nConnection closed`
    }

    const onMessage = (evt: MessageEvent) => {
      const msg = JSON.parse(evt.data)
      // console.log(connection.host, msg)
      switch (msg.event) {
        case 'init':
          console.log(msg)
          // User Data
          connection.userID = msg.user.userID
          connection.color = msg.user.color
          connection.position = msg.user.position

          // Tell server you joined
          if (connection.connected) {
            // Send message to host to confirm
            websocket.send(JSON.stringify({
              event: 'userJoin',
              user: {
                userID: connection.userID,
                serverID: connection.serverID,
                color: connection.color,
                position: connection.position,
              }
            }))
          }

          // Log
          if (connection.host) {
            p.innerText = `${p.innerText}\nUser ID: ${connection.userID}`
          } else {
            p.innerText = `${p.innerText}\nUser ID: ${connection.userID}, Server: ${connection.serverID}`
          }
          break
        case 'qrCode':
          if (connection.host) {
            imgRef.current!.src = msg.data
            p.innerText = `${p.innerText}\nQR Code Received: ${connection.userID}`
          }
          break
        case 'userJoin':
          users.set(msg.user.userID, {
            color: msg.user.color,
            position: msg.user.position,
          })
          p.innerText = `${p.innerText}\nUser Joined: ${msg.userID}`
          break
        case 'userLeft':
          users.delete(msg.userID)
          p.innerText = `${p.innerText}\nUser Left: ${msg.userID}`
          break
        case 'touchStart':
          users.set(msg.userID, {
            color: msg.color,
            position: msg.position,
          })
          break
        case 'touchMove':
          users.set(msg.userID, {
            color: msg.color,
            position: msg.position,
          })
          break
        case 'touchRemove':
          break
      }
    }

    const websocket = new WebSocket(`ws://${USER_IP}:8080`)
    websocket.addEventListener('open', onOpen)
    websocket.addEventListener('close', onClose)
    websocket.addEventListener('message', onMessage)

    // Send phone touches to server

    const div = document.querySelector('.clickArea') as HTMLDivElement

    // Click

    let mouseDown = false

    const onMouseDown = (evt: MouseEvent) => {
      mouseDown = true
      const x = evt.clientX
      const y = evt.clientY
      connection.position = [x, y]
      websocket.send(JSON.stringify({
        event: 'touchStart',
        userID: connection.userID,
        serverID: connection.serverID,
        color: connection.color,
        position: [x, y],
      }))
    }

    const onMouseMove = (evt: MouseEvent) => {
      if (!mouseDown) return
      const x = evt.clientX
      const y = evt.clientY
      connection.position = [x, y]
      websocket.send(JSON.stringify({
        event: 'touchMove',
        userID: connection.userID,
        serverID: connection.serverID,
        color: connection.color,
        position: [x, y],
      }))
    }

    const onMouseRemove = () => {
      mouseDown = false
      websocket.send(JSON.stringify({
        event: 'touchRemove',
        userID: connection.userID,
        serverID: connection.serverID,
      }))
    }

    // Touch

    const onTouchDown = (evt: TouchEvent) => {
      const x = evt.touches[0].clientX
      const y = evt.touches[0].clientY
      connection.position = [x, y]
      websocket.send(JSON.stringify({
        event: 'touchStart',
        userID: connection.userID,
        serverID: connection.serverID,
        color: connection.color,
        position: [x, y],
      }))
    }

    const onTouchMove = (evt: TouchEvent) => {
      const x = evt.touches[0].clientX
      const y = evt.touches[0].clientY
      connection.position = [x, y]
      websocket.send(JSON.stringify({
        event: 'touchMove',
        userID: connection.userID,
        serverID: connection.serverID,
        color: connection.color,
        position: [x, y],
      }))
    }

    const onTouchRemove = () => {
      websocket.send(JSON.stringify({
        event: 'touchRemove',
        userID: connection.userID,
        serverID: connection.serverID,
      }))
    }

    let raf = -1
    const PI2 = Math.PI * 2
    const onUpdate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      users.forEach((user: User) => {
        ctx.beginPath()
        ctx.arc(user.position[0], user.position[1], 10, 0, PI2, false);
        ctx.fillStyle = user.color
        ctx.fill()
      })

      if (connection.serverID.length > 0) {
        ctx.beginPath()
        ctx.arc(connection.position[0], connection.position[1], 10, 0, PI2, false);
        ctx.fillStyle = connection.color
        ctx.fill()
      }

      ctx.fillStyle = 'white'
      ctx.font = '18px Arial'
      ctx.fillText(`Total Users: ${users.size}`, 10, window.innerHeight - 10)
      raf = requestAnimationFrame(onUpdate)
    }
    onUpdate()

    if (!connection.host) {
      div.addEventListener('mousedown', onMouseDown)
      div.addEventListener('mousemove', onMouseMove)
      div.addEventListener('mouseup', onMouseRemove)
      div.addEventListener('touchstart', onTouchDown)
      div.addEventListener('touchmove', onTouchMove)
      div.addEventListener('touchend', onTouchRemove)
    }

    return () => {
      cancelAnimationFrame(raf)
      raf = -1
      window.removeEventListener('resize', onResize)
      div.removeEventListener('mousedown', onMouseDown)
      div.removeEventListener('mousemove', onMouseMove)
      div.removeEventListener('mouseup', onMouseRemove)
      div.removeEventListener('touchstart', onTouchDown)
      div.removeEventListener('touchmove', onTouchMove)
      div.removeEventListener('touchend', onTouchRemove)
      websocket.removeEventListener('open', onOpen)
      websocket.removeEventListener('close', onClose)
      websocket.removeEventListener('message', onMessage)
      websocket.close()
    }
  }, [])

  return (
    <div className='log'>
      <p ref={pRef}>Connecting...</p>
      <img ref={imgRef} />
      <div className='clickArea'>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

export default App
