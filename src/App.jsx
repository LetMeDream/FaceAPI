import { useState } from 'react'
import './App.css'
import CameraContainer from './components/CameraContainer/CameraContainer'
import { Toaster, toast } from 'react-hot-toast'

function App() {
  const [isCameraShown, setIsCameraShown] = useState(false)

  const activateCamera = async () => {
    if (!isCameraShown){
      setIsCameraShown(true)
      const video = document.getElementById('video')
      console.log(video)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {}
        })
        video.srcObject = stream
      } catch (error) {
        console.error(error)
        toast.error(error?.message)
      }
    } else {
      setIsCameraShown(false)
      const video = document.getElementById('video')
      const stream = video.srcObject
      const tracks = stream.getTracks()

      tracks.forEach(track => {
        track.stop()
      })

      video.srcObject = null
    }
  }

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <div className="card">

        <CameraContainer isCameraShown={isCameraShown} />

        <button onClick={activateCamera}>
          Turn { isCameraShown ? 'off': 'on' } Camera
        </button>
      </div>
    </>
  )
}

export default App
