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

  /* Loading Models and Triggering detections */
  useEffect(() => {
    setTimeout(() => {
      const video = document.getElementById('video')
      const canvas = document.getElementById('overlay')
      // const context = canvas.getContext('2d');

      async function detect () {
        // console here gives an array of undefined

        if (video && canvas) {
          const dims = faceapi.matchDimensions(canvas, video, true);

          const fullFaceDescriptions = await faceapi.detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors()
            // .withFaceExpressions()

          const resizedResults = faceapi.resizeResults(fullFaceDescriptions, dims);

          // context.clearRect(0, 0, canvas.width, canvas.height);
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
        setTimeout(detect, 100)
      }

      if (isCameraShown) {

        const MODEL_URL = "FaceAPI/models";
        Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]).then(async () => {
            detect()
        }).catch((err) => {
            console.log(err)
        });
      }


    }, 1500)
  }, [isCameraShown])

  /* Tracking fdace rectangle */
  useEffect(() => {
    console.log(faceRectangle)
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
