import { useState, useEffect } from 'react'
import './App.css'
import CameraContainer from './components/CameraContainer/CameraContainer'
import { Toaster, toast } from 'react-hot-toast'
import * as faceapi from 'face-api.js'

function App() {
  const [isCameraShown, setIsCameraShown] = useState(false)
  const [faceRectangle, setFaceRectangle] = useState({
    topLeft: { x: 0, y: 0},
    bottomRight: { x: 0, y: 0}
  })

  /* Compare coordinates of the corners of two rectangles */
  const areRectanglesDifferent = (rect1, rect2) => {
    return (
      rect1.topLeft.x !== rect2.topLeft.x ||
      rect1.topLeft.y !== rect2.topLeft.y ||
      rect1.bottomRight.x !== rect2.bottomRight.x ||
      rect1.bottomRight.y !== rect2.bottomRight.y
    )
  }

  /* Tracking face rectangle */
  useEffect(() => {
    console.log('TopLeft. X: ' + faceRectangle?.topLeft?.x + ', Y:' + faceRectangle?.topLeft?.x)
  }, [
    faceRectangle,
    faceRectangle?.topLeft?.x, 
    faceRectangle?.topLeft?.y, 
    faceRectangle?.bottomRight?.x, 
    faceRectangle?.bottomRight?.y,
  ])

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
        video.onplay = onPlay
      } catch (error) {
        console.error(error)
        toast.error(error?.message)
      }
    } else {
      setIsCameraShown(false)
      let canvas = document.getElementById('overlay')
      let context = canvas.getContext('2d');
      // debugger
      let video = document.getElementById('video')
      let stream = video.srcObject
      let tracks = stream.getTracks()
      
      tracks.forEach(track => {
        track.stop()
      })
      
      // Use requestAnimationFrame to ensure the canvas is updated
      setTimeout(() => {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }, 10);


      video.srcObject = null
    }
  }

  /* Function to be played on video load .
  *  Will Load MODELS and start Detection and drawing.
  */
  const onPlay = async () => {
      const video = document.getElementById('video')
      const canvas = document.getElementById('overlay')
      const context = canvas.getContext('2d');
      const dims = faceapi.matchDimensions(canvas, video, true);

      /* Function that detects and draws faces */
      async function detect () {
        // console here gives an array of undefined

        if (video && canvas) {

          const fullFaceDescriptions = await faceapi.detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors()
            // .withFaceExpressions()

          const resizedResults = faceapi.resizeResults(fullFaceDescriptions, dims);

          context.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedResults);
          faceapi.draw.drawFaceLandmarks(canvas, fullFaceDescriptions);
          // faceapi.draw.drawFaceExpressions(canvas, fullFaceDescriptions, 0.05);

          /* Storing rectangle position */
          if (resizedResults[0]) {
            const newFaceRectangle = {
              topLeft: {
                x: resizedResults[0].detection.box.topLeft.x,
                y: resizedResults[0].detection.box.topLeft.y
              },
              bottomRight: {
                x: resizedResults[0].detection.box.bottomRight.x,
                y: resizedResults[0].detection.box.bottomRight.y
              }
            }
          
            // Check if the new coordinates are different from the current ones
            if (areRectanglesDifferent(newFaceRectangle, faceRectangle)) {
              setFaceRectangle(newFaceRectangle)
            }
          } else if (areRectanglesDifferent(faceRectangle, { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } } )) {
            setFaceRectangle({
              topLeft: { x: 0, y: 0 },
              bottomRight: { x: 0, y: 0 }
            })
          }

          // console.log(fullFaceDescriptions)
        }

        // requestAnimationFrame(detect);
        setTimeout(detect, 500)
      }

      if (isCameraShown) {

        const MODEL_URL = "models";
        Promise.all([ /* Load required models */
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]).then(() => {
            detect()
        }).catch((err) => {
            console.log(err)
        });
      }
  }

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <div className="card">

        <CameraContainer onPlay={onPlay} />


        <button onClick={activateCamera}>
          Turn { isCameraShown ? 'off': 'on' } Camera
        </button>
      </div>
    </>
  )
}

export default App
