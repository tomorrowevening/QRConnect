import { useEffect, useRef } from 'react'

// const USER_IP = 'localhost'
const USER_IP = '192.168.1.166'

function App() {
  const pRef = useRef<HTMLParagraphElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const p = pRef.current!
    const canvas = canvasRef.current!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const ctx = canvas.getContext('2d')!
    const touches = new Map<string, number[]>()

    const connection = {
      connected: false,
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
          connection.userID = msg.userID

          // Tell server you joined
          if (!connection.host && connection.connected) {
            // Send message to host to confirm
            websocket.send(JSON.stringify({
              event: 'userJoin',
              userID: connection.userID,
              serverID: connection.serverID,
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
          if (connection.host) {
            p.innerText = `${p.innerText}\nUser Joined: ${msg.userID}`
          }
          break
        case 'userLeft':
          if (connection.host) {
            touches.delete(msg.userID)
            p.innerText = `${p.innerText}\nUser Left: ${msg.userID}`
          }
          break
        case 'touchStart':
          if (connection.host) {
            touches.set(msg.userID, msg.data)
          }
          break
        case 'touchMove':
          if (connection.host) {
            touches.set(msg.userID, msg.data)
          }
          break
        case 'touchRemove':
          if (connection.host) {
            touches.delete(msg.userID)
          }
          break
      }
    }

    const websocket = new WebSocket(`ws://${USER_IP}:8080`)
    websocket.addEventListener('open', onOpen)
    websocket.addEventListener('close', onClose)
    websocket.addEventListener('message', onMessage)

    // Send phone touches to server

    const div = document.querySelector('.clickArea') as HTMLDivElement

    const onTouchDown = (evt: TouchEvent) => {
      const x = evt.touches[0].clientX
      const y = evt.touches[0].clientY
      websocket.send(JSON.stringify({
        event: 'touchStart',
        userID: connection.userID,
        serverID: connection.serverID,
        data: [x, y],
      }))
    }

    const onTouchMove = (evt: TouchEvent) => {
      const x = evt.touches[0].clientX
      const y = evt.touches[0].clientY
      websocket.send(JSON.stringify({
        event: 'touchMove',
        userID: connection.userID,
        serverID: connection.serverID,
        data: [x, y],
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
    if (connection.host) {
      const PI2 = Math.PI * 2
      const onUpdate = () => {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        touches.forEach((value: number[]) => {
          ctx.beginPath()
          ctx.arc(value[0], value[1], 10, 0, PI2, false);
          ctx.fillStyle = 'red'
          ctx.fill()
        })
        raf = requestAnimationFrame(onUpdate)
      }
      onUpdate()
    } else {
      div.addEventListener('touchstart', onTouchDown)
      div.addEventListener('touchmove', onTouchMove)
      div.addEventListener('touchend', onTouchRemove)
    }

    return () => {
      cancelAnimationFrame(raf)
      raf = -1
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
