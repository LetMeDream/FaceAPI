import { useState, useEffect } from 'react'
import './App.css'
import CameraContainer from './components/CameraContainer/CameraContainer'
import { Toaster, toast } from 'react-hot-toast'
import * as faceapi from 'face-api.js'

function App() {
  const [isCameraShown, setIsCameraShown] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [faceRectangle, setFaceRectangle] = useState({
    topLeft: { x: 0, y: 0},
    bottomRight: { x: 0, y: 0}
  })
  const [adjustedFaceRectangle, setAdjustedFaceRectangle] = useState({
    topLeft: { x: 0, y: 0},
    bottomRight: { x: 0, y: 0}
  })
  const [expression, setExpression] = useState(null)
  let predictedAges = []

  let lastAgeUpdate = Date.now();
  const ageUpdateInterval = 1000;

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
  /* useEffect(() => {
    console.log('TopLeft. X: ' + faceRectangle?.topLeft?.x + ', Y:' + faceRectangle?.topLeft?.x)
  }, [
    faceRectangle,
    faceRectangle?.topLeft?.x, 
    faceRectangle?.topLeft?.y, 
    faceRectangle?.bottomRight?.x, 
    faceRectangle?.bottomRight?.y,
  ]) */

  const activateCamera = async () => {
    if (!isCameraShown){
      setIsCameraShown(true)
      setIsPlaying(true)
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
      setIsPlaying(false)
      setExpression(null)
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

  function interpolateAgePredictions(age) {
    predictedAges = [age].concat(predictedAges).slice(0, 30)
    const avgPredictedAge = predictedAges.reduce((total, a) => total + a) / predictedAges.length
    return avgPredictedAge
}

  /* Function to be played on video load .
  *  Will Load MODELS and start Detection and drawing.
  */
  /* const onPlay = async () => {
      const video = document.getElementById('video')
      const canvas = document.getElementById('overlay')
      const context = canvas.getContext('2d');
      const dims = faceapi.matchDimensions(canvas, video, true);

      //  Function that detects and draws faces
      async function detect () {
        // console here gives an array of undefined

        if (video && canvas) {

          const fullFaceDescriptions = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({inputSize: 160}))
            .withFaceLandmarks()
            .withFaceDescriptor()
            .withFaceExpressions()
            .withAgeAndGender()

          if (fullFaceDescriptions) {

            const resizedResults = faceapi.resizeResults(fullFaceDescriptions, dims);
  
            context.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedResults);
            // faceapi.draw.drawFaceLandmarks(canvas, resizedResults);
            // faceapi.draw.drawFaceExpressions(canvas, resizedResults, 0.05);
  
            if (resizedResults) {
              // Storing rectangle position/
              const newFaceRectangle = {
                topLeft: {
                  x: resizedResults.detection.box.topLeft.x,
                  y: resizedResults.detection.box.topLeft.y
                },
                bottomRight: {
                  x: resizedResults.detection.box.bottomRight.x,
                  y: resizedResults.detection.box.bottomRight.y
                }
              }
              // Draw smaller rectangle
              const margin = 20; // Margin for the smaller rectangle
              const smallRect = {
                topLeft: {
                  x: resizedResults.detection.box.topLeft.x + 2*margin,
                  y: resizedResults.detection.box.topLeft.y + margin
                },
                bottomRight: {
                  x: resizedResults.detection.box.bottomRight.x - 2*margin,
                  y: resizedResults.detection.box.bottomRight.y - margin
                }
              }

              context.strokeStyle = 'red';
              context.lineWidth = 2;
              context.strokeRect(
                smallRect.topLeft.x,
                smallRect.topLeft.y,
                smallRect.bottomRight.x - smallRect.topLeft.x,
                smallRect.bottomRight.y - smallRect.topLeft.y
              );

              // Check if the new coordinates are different from the current ones
              if (areRectanglesDifferent(newFaceRectangle, faceRectangle)) {
                setFaceRectangle(newFaceRectangle),
                setAdjustedFaceRectangle(smallRect)
              }
              else if (areRectanglesDifferent(faceRectangle, { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } } )) {
                setFaceRectangle({
                  topLeft: { x: 0, y: 0 },
                  bottomRight: { x: 0, y: 0 }
                })
                setAdjustedFaceRectangle({
                  topLeft: { x: 0, y: 0 },
                  bottomRight: { x: 0, y: 0 }
                })
              }


              // Set current expression
              let expressions = resizedResults?.expressions
              if (expressions) {
                let currentExpression = Object.entries(expressions).reduce((max, current) => max[1] > current[1] ? max : current)
                setExpression(currentExpression)
              }

              // Set and DRAW current age and gender
              let ageGenderResults = fullFaceDescriptions;
              if (Object.entries(ageGenderResults).length){

                const now = Date.now();
                if (now - lastAgeUpdate > ageUpdateInterval) {
                    ageGenderResults = await faceapi.detectSingleFace(video,  new faceapi.TinyFaceDetectorOptions({inputSize: 160}))
                        .withAgeAndGender();
                    lastAgeUpdate = now;
                }
                
                if (ageGenderResults) {
                  const { age, gender, genderProbability } = ageGenderResults;
                  const interpolatedAge = interpolateAgePredictions(age)
  
                  new faceapi.draw.DrawTextField(
                      [
                          `${faceapi.utils.round(interpolatedAge, 0)} years`,
                          `${gender} (${faceapi.utils.round(genderProbability)})`
                      ],
                      resizedResults?.detection.box.bottomRight
                  )?.draw(canvas);
                }

              }

            } 
          }

          // console.log(fullFaceDescriptions)
        }

        requestAnimationFrame(detect);
        // setTimeout(detect, 1000)
      }

      if (isCameraShown) {

        const MODEL_URL = "models";
        Promise.all([ // Load required models 
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]).then(() => {
            detect()
        }).catch((err) => {
            console.log(err)
        });
      }
  } */

  const onPlay = async () => {
      const video = document.getElementById('video');
      const canvas = document.getElementById('overlay');
      const context = canvas.getContext('2d');
      const dims = faceapi.matchDimensions(canvas, video, true);
  
      async function detect() {
          if (video && canvas) {
              const fullFaceDescriptions = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
                  .withFaceLandmarks()
                  .withFaceDescriptor()
                  .withFaceExpressions()
                  .withAgeAndGender();
  
              if (fullFaceDescriptions) {
                  const resizedResults = faceapi.resizeResults(fullFaceDescriptions, dims);
                  context.clearRect(0, 0, canvas.width, canvas.height);
  
                  // 🔹 1. Obtener la detección original
                  const originalBox = resizedResults.detection.box;
  
                  // 🔹 2. Reflejar las coordenadas X para que coincidan con el video espejado
                  const mirroredBox = {
                      x: canvas.width - (originalBox.x + originalBox.width),
                      y: originalBox.y,
                      width: originalBox.width,
                      height: originalBox.height
                  };
  
                  // 🔹 3. Dibujar el rectángulo principal reflejado
                  context.strokeStyle = 'red';
                  context.lineWidth = 2;
                  context.strokeRect(mirroredBox.x, mirroredBox.y, mirroredBox.width, mirroredBox.height);
  
                  // 🔹 4. Dibujar un rectángulo más pequeño dentro del principal
                  const margin = mirroredBox.width / 6; // Margen del rectángulo pequeño
                  const smallRect = {
                      x: mirroredBox.x +  margin,
                      y: mirroredBox.y + margin,
                      width: mirroredBox.width - 2 * margin,
                      height: mirroredBox.height - 2 * margin
                  };
  
                  context.strokeStyle = 'blue'; // Color diferente para el cuadro pequeño
                  context.lineWidth = 2;
                  context.strokeRect(smallRect.x, smallRect.y, smallRect.width, smallRect.height);
  
                  // 🔹 5. Actualizar el estado con las nuevas coordenadas reflejadas
                  const newFaceRectangle = {
                      topLeft: { x: mirroredBox.x, y: mirroredBox.y },
                      bottomRight: { x: mirroredBox.x + mirroredBox.width, y: mirroredBox.y + mirroredBox.height }
                  };
  
                  const newSmallRectangle = {
                      topLeft: { x: smallRect.x, y: smallRect.y },
                      bottomRight: { x: smallRect.x + smallRect.width, y: smallRect.y + smallRect.height }
                  };
  
                  if (areRectanglesDifferent(newFaceRectangle, faceRectangle)) {
                      setFaceRectangle(newFaceRectangle);
                      setAdjustedFaceRectangle(newSmallRectangle);
                  } else if (areRectanglesDifferent(faceRectangle, { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } })) {
                      setFaceRectangle({ topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } });
                      setAdjustedFaceRectangle({ topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } });
                  }
  
                  // 🔹 6. Detectar estado de ánimo y reflejar su posición
                  let expressions = resizedResults?.expressions;
                  if (expressions) {
                      let currentExpression = Object.entries(expressions).reduce((max, current) => max[1] > current[1] ? max : current);
                      setExpression(currentExpression);
                  }
  
                  // 🔹 7. Detectar edad y género reflejados
                  let ageGenderResults = fullFaceDescriptions;
                  if (Object.entries(ageGenderResults).length) {
                      const now = Date.now();
                      if (now - lastAgeUpdate > ageUpdateInterval) {
                          ageGenderResults = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
                              .withAgeAndGender();
                          lastAgeUpdate = now;
                      }
  
                      if (ageGenderResults) {
                          const { age, gender, genderProbability } = ageGenderResults;
                          const interpolatedAge = interpolateAgePredictions(age);
  
                          new faceapi.draw.DrawTextField(
                              [
                                  `${faceapi.utils.round(interpolatedAge, 0)} years`,
                                  `${gender} (${faceapi.utils.round(genderProbability)})`
                              ],
                              { x: mirroredBox.x + mirroredBox.width, y: (mirroredBox.y + mirroredBox.height) } // Ajustar posición reflejada
                          ).draw(canvas);
                      }
                  }
              }
          }
  
          requestAnimationFrame(detect);
      }
  
      if (isCameraShown) {
          const MODEL_URL = "models";
          Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
              faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
              faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
              faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
              faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
          ]).then(() => {
              detect();
          }).catch((err) => {
              console.log(err);
          });
      }
  };
    


  const onPause = () => {
    let video = document.getElementById('video')
    video.pause()
    setIsPlaying(false)
  }

  const onResume = () => {
    let video = document.getElementById('video')
    video.play()
    setIsPlaying(true)
  }

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <div className="card">

        <CameraContainer onPlay={onPlay} />

        <div className='flex gap-1'>
          <button onClick={activateCamera}>
            Turn { isCameraShown ? 'off': 'on' } Camera
          </button>
          {
            isCameraShown ? (
              <button onClick={isPlaying ? onPause : onResume}>
                { isPlaying ? 'Pause' : 'Resume' }
              </button>
            ) : null
          }
        </div>

        {
          isCameraShown ? (
            <div className='info flex flex-col gap-2'>
              <div className="mood border border-blue-100 p-4 rounded">
                Current Mood: &nbsp;
                <span className='text-slate-500'>
                  {expression?.[0] || ''}
                </span> 
              </div>
              <div className="mood border border-blue-100 p-4 rounded">
                Current Position: &nbsp;
                <span className='text-slate-500'>
                  {faceRectangle?.topLeft?.x || ''}
                </span> 
              </div>
              <div className="mood border border-blue-100 p-4 rounded">
                Current Adjusted Position: &nbsp;
                <span className='text-slate-500'>
                  {adjustedFaceRectangle?.topLeft?.x || ''}
                </span> 
              </div>
            </div>
          ) : null
        }
        
      </div>
    </>
  )
}

export default App
