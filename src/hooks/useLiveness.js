import * as faceapi from 'face-api.js'
import { useState, useEffect } from 'react'
import { interpolateAgePredictions, isRetangleInside, areRectanglesDifferent } from '../helpers/liveness'
import toast from 'react-hot-toast'

const useLiveness = () => {
  const [isCameraShown, setIsCameraShown] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  /* Coordinate for originally generated face rectangle */
  const [faceRectangle, setFaceRectangle] = useState({
    topLeft: { x: 0, y: 0},
    bottomRight: { x: 0, y: 0}
  })
  /* Local (inside of canvas) coordinates for the Adjusted (smaller) rectangle. 
  *  This rectangle is used to calculate the coordinates of the face rectangle in the video according to the Canvas.
  */
  const [, setAdjustedFaceRectangle] = useState({
    topLeft: { x: 0, y: 0},
    bottomRight: { x: 0, y: 0}
  })
  const [adjustedFaceRectangleCoordinates, setAdjustedFaceRectangleCoordinates] = useState(null)
  /* Local (inside of canvas) coordinates for circle-focus Boundary Rectangle */
  const [circleFocusBoundaryRectangle, setCircleFocusBoundaryRectangle] = useState(null)
  const [prevCircleFocusBoundaryRectangle, setPrevCircleFocusBoundaryRectangle] = useState(null); // Extra-state, required only for utility of useEffect.
  const [isValid, setIsValid] = useState(false) // 'inside' || 'outside'
  const [validObject, setValidObject] = useState({ // Object to handle the alert when no face is detected
    /* Counter for counting the number of frames without face detected */
    counter: 0,
    alerted: false
  })

  /* Expression */
  const [expression, setExpression] = useState(null)
  /* Ages */

  let lastAgeUpdate = Date.now();
  const ageUpdateInterval = 1000;

  /* UseEffect for handling validation when no face detected */
  useEffect(() => {
    console.log(validObject.counter);
    if (validObject.counter > 20 && !validObject.alerted) {
      setValidObject((prev) => {
        return {
          ...prev,
          alerted: true
        }
      })
      setIsValid(false)
      toast.error('Face not detected')
    }
  }, [validObject.counter]);

  /* circle-focus rect boundary */
  useEffect(() => {
    if (
      circleFocusBoundaryRectangle &&
      JSON.stringify(circleFocusBoundaryRectangle) !== JSON.stringify(prevCircleFocusBoundaryRectangle)
    ) {
      console.log(circleFocusBoundaryRectangle);
      setPrevCircleFocusBoundaryRectangle(circleFocusBoundaryRectangle);
    }
  }, [circleFocusBoundaryRectangle, prevCircleFocusBoundaryRectangle]);

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
      let stream = video?.srcObject
      let tracks = stream?.getTracks()
      
      tracks?.forEach(track => {
        track?.stop()
      })
      
      // Use requestAnimationFrame to ensure the canvas is updated
      setTimeout(() => {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }, 10);


      video.srcObject = null
    }
  }

  /* Load models */
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "models";
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error(err);
      }
    };

    loadModels();
  }, []);
  

  /* Function to be played on video load .
  *  Will start Detection and drawing.
  */
  const onPlay = async () => {
    if (!modelsLoaded) return;

    const video = document.getElementById('video')
    const canvas = document.getElementById('overlay')
    const context = canvas.getContext('2d');
    const dims = faceapi.matchDimensions(canvas, video, true);

    async function detect () {
      if (video && canvas) {
        if (video.paused || video.ended) {
          return; // Stoping detection if video is paused oor ended
        }

        const fullFaceDescriptions = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({inputSize: 288}))
          .withFaceLandmarks()
          .withFaceDescriptor()
          .withFaceExpressions()
          .withAgeAndGender()

          
        if (fullFaceDescriptions) {
          const resizedResults = faceapi.resizeResults(fullFaceDescriptions, dims);
          
          context.clearRect(0, 0, canvas.width, canvas.height);
          // faceapi.draw.drawDetections(canvas, resizedResults)
          // faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

          const landmarks = resizedResults.landmarks.positions;
          context.fillStyle = 'blue';
          let importantLandmarks = [1, 15, 30]
          landmarks.forEach((point, index) => {
            if (importantLandmarks.includes(index)) {
              context.beginPath();
              context.arc(point.x, point.y, 2, 0, 2 * Math.PI);
              context.fill();
              context.fillText(index, point.x + 3, point.y - 3);
            }
          });

          if (resizedResults) {
            setValidObject({
              counter: 0,
              alerted: false
            })
            const newFaceRectangle = {
              topLeft: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.bottomRight.x),   // Invirtiendo eje x
                y: resizedResults.detection.box.topLeft.y
              },
              topRight: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.bottomLeft.x),    // Invirtiendo eje x
                y: resizedResults.detection.box.topRight.y,
              },
              bottomLeft: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.topRight.x),     // Invirtiendo eje x
                y: resizedResults.detection.box.bottomLeft.y
              },
              bottomRight: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.topLeft.x),      // Invirtiendo eje x
                y: resizedResults.detection.box.bottomRight.y
              }
            }
            const margin = 15;
            // Rectangle to be drawn in the canvas
            const smallRect = {
              topLeft: {
                x: resizedResults.detection.box.topLeft.x + 2*margin,
                y: resizedResults.detection.box.topLeft.y + margin
              },
              topRight: {
                x: resizedResults.detection.box.topRight.x - 2*margin,
                y: resizedResults.detection.box.topRight.y + margin
              },
              bottomRight: {
                x: resizedResults.detection.box.bottomRight.x - 2*margin,
                y: resizedResults.detection.box.bottomRight.y - margin
              },
              bottomLeft: {
                x: resizedResults.detection.box.bottomLeft.x + 2*margin,
                y: resizedResults.detection.box.bottomLeft.y - margin
              }
            }
            


            // Real coordinates of the rectangle (According to the canvas and inverted)
            let smallRectRealCoordinates = {
              topLeft: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.bottomRight.x) + 2*margin,  // Inverting coordinates
                y: resizedResults.detection.box.topLeft.y + margin
              },
              topRight: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.bottomLeft.x) - 2*margin,   // Inverting coordinates
                y: resizedResults.detection.box.topRight.y + margin
              },
              bottomRight: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.topLeft.x) - 2*margin,      // Inverting coordinates
                y: resizedResults.detection.box.bottomRight.y - margin
              },
              bottomLeft: {
                x: (resizedResults.detection.imageWidth - resizedResults.detection.box.topRight.x) + 2*margin,     // Inverting coordinates
                y: resizedResults.detection.box.bottomLeft.y - margin
              }
            }
            /* But, if our parent <div> container is smaller than the 640px that the library seems to require, then we need to make a transformation to our coordinates */
            const containerDiv = document.getElementsByClassName('camera-container')?.[0]
            const styles = getComputedStyle(containerDiv);
            const containerWidth = parseFloat(styles.getPropertyValue('--main-width'))

            /* Calculating Circle Boundaries */
            // Get boundingClientRect of the canvas
            const canvasRect = canvas.getBoundingClientRect();
            // Getting coordinates of the circle focus, with respect to the canvas
            const circleFocus = document.getElementById('circle-mask')
            const circleFocusRect = circleFocus?.getBoundingClientRect()
            let circleFocusRectRealCoordinates = {
              left: circleFocusRect.left - canvasRect.left,
              top: circleFocusRect.top - canvasRect.top,
              width: circleFocusRect.width,
              height: circleFocusRect.height,
              right: circleFocusRect.right - canvasRect.left,
              bottom: circleFocusRect.bottom - canvasRect.top,
            }
            const circleRectCorners = {
              topLeft: {
                x: circleFocusRectRealCoordinates.left,
                y: circleFocusRectRealCoordinates.top,
              },
              topRight: {
                x: circleFocusRectRealCoordinates.right,
                y: circleFocusRectRealCoordinates.top,
              },
              bottomLeft: {
                x: circleFocusRectRealCoordinates.left,
                y: circleFocusRectRealCoordinates.bottom,
              },
              bottomRight: {
                x: circleFocusRectRealCoordinates.right,
                y: circleFocusRectRealCoordinates.bottom,
              },
            };
            setCircleFocusBoundaryRectangle(circleRectCorners)

            let valid, modifiedSmallRectRealCoorinates
            if (containerDiv.clientWidth < containerWidth){
              let scaleFactor = containerDiv.clientWidth / containerWidth
              modifiedSmallRectRealCoorinates = Object.fromEntries(
                Object.entries(smallRectRealCoordinates).map(([key, { x, y }]) => [
                  key,
                  { x: x * scaleFactor, y },
                ])
              );
              valid = isRetangleInside(circleRectCorners, modifiedSmallRectRealCoorinates)
            } else {
              valid = isRetangleInside(circleRectCorners, smallRectRealCoordinates)
            }
            setIsValid(valid)

            // Draw the rectangle on the canvas
            context.strokeStyle = valid ? 'green' : 'red';
            context.lineWidth = 2;
            context.strokeRect(
              smallRect.topLeft.x,
              smallRect.topLeft.y,
              smallRect.bottomRight.x - smallRect.topLeft.x,
              smallRect.bottomRight.y - smallRect.topLeft.y
            );

            if (areRectanglesDifferent(newFaceRectangle, faceRectangle)) {
              setFaceRectangle(newFaceRectangle),
              setAdjustedFaceRectangle(smallRect)
              setAdjustedFaceRectangleCoordinates(smallRectRealCoordinates)
            } else if (areRectanglesDifferent(faceRectangle, { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } } )) {
              setFaceRectangle({
                topLeft: { x: 0, y: 0 },
                bottomRight: { x: 0, y: 0 }
              })
              setAdjustedFaceRectangle({
                topLeft: { x: 0, y: 0 },
                bottomRight: { x: 0, y: 0 }
              })
              
            }


            /* Setting mood/expression */
            let expressions = resizedResults?.expressions
            if (expressions) {
              let currentExpression = Object.entries(expressions).reduce((max, current) => max[1] > current[1] ? max : current)
              setExpression(currentExpression)
            }

            /* Setting and drawing age and gender */
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

                const ageText = `${faceapi.utils.round(interpolatedAge, 0)} years`;
                const genderText = `${gender} (${faceapi.utils.round(genderProbability)})`;

                const textX = resizedResults.detection.box.bottomRight.x;
                const textY = resizedResults.detection.box.bottomRight.y;

                context.save();
                context.scale(-1, 1);
                context.translate(-canvas.width, 0);

                context.font = '16px Arial';
                context.fillStyle = 'white';
                context.strokeStyle = 'black';
                context.lineWidth = 2;

                context.strokeText(ageText, canvas.width - textX + 2*margin, textY);
                context.fillText(ageText, canvas.width - textX + 2*margin, textY);
                context.strokeText(genderText, canvas.width - textX + 2*margin, textY + margin);
                context.fillText(genderText, canvas.width - textX + 2*margin, textY + margin);

                context.restore();
              }
            }
          }
        } else {
          setValidObject((prev) => {
            return {
              ...prev,
              counter: prev.counter + 1
            }
          })
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
        // requestAnimationFrame(detect);

        setTimeout(() => {
          detect()
        }, 100);

      }
    }

    if (isCameraShown) {
      detect();
    }

    // Start detection if the video is played
    video?.addEventListener('play', () => {
      if (isCameraShown) {
        detect();
      }
    });

  }
  
  /* Pausing video */
  const onPause = () => {
    let video = document.getElementById('video')
    video.pause()
    setIsPlaying(false)
  }

  /* Resuming video */
  const onResume = () => {
    let video = document.getElementById('video')
    video.play()
    setIsPlaying(true)
  }


  return {
    onPlay,
    onPause,
    onResume,
    isValid,
    activateCamera,
    isCameraShown,
    isPlaying,
    expression,
    adjustedFaceRectangleCoordinates
  }
}

export default useLiveness