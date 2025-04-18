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
  const [headOrientation, setHeadOrientation] = useState('center'); // State for storing head orientation


  /* Expression */
  const [expression, setExpression] = useState(null)
  /* Ages */

  let lastAgeUpdate = Date.now();
  const ageUpdateInterval = 1000;

  /* UseEffect for handling validation when no face detected */
  useEffect(() => {
    // console.log(validObject.counter);
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
  

  /* Function to be played on video load.
  * Will start detection and drawing.
  */
  const onPlay = async () => {
    if (!modelsLoaded) return;

    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay');
    if (!video || !canvas) return;
    const context = canvas.getContext('2d');
    const dims = faceapi.matchDimensions(canvas, video, true);

    // Utility: Invert an x coordinate given the image width.
    const invertX = (x, imageWidth, offset = 0) => {
      return imageWidth - x + offset;
    };

    // Utility: Transform detection box coordinates.
    const getInvertedFaceRectangle = (detection) => {
      return {
        topLeft: {
          x: invertX(detection.box.bottomRight.x, detection.imageWidth),
          y: detection.box.topLeft.y
        },
        topRight: {
          x: invertX(detection.box.bottomLeft.x, detection.imageWidth),
          y: detection.box.topRight.y
        },
        bottomLeft: {
          x: invertX(detection.box.topRight.x, detection.imageWidth),
          y: detection.box.bottomLeft.y
        },
        bottomRight: {
          x: invertX(detection.box.topLeft.x, detection.imageWidth),
          y: detection.box.bottomRight.y
        }
      };
    };

    // Utility: Get adjusted rectangle with margins.
    const getSmallRectangle = (detection, margin) => {
      return {
        topLeft: {
          x: detection.box.topLeft.x + 2 * margin,
          y: detection.box.topLeft.y + margin
        },
        topRight: {
          x: detection.box.topRight.x - 2 * margin,
          y: detection.box.topRight.y + margin
        },
        bottomRight: {
          x: detection.box.bottomRight.x - 2 * margin,
          y: detection.box.bottomRight.y - margin
        },
        bottomLeft: {
          x: detection.box.bottomLeft.x + 2 * margin,
          y: detection.box.bottomLeft.y - margin
        }
      };
    };

    // Utility: Get real coordinates for the adjusted rectangle (inverted on x-axis)
    const getSmallRectangleRealCoordinates = (detection, margin) => {
      return {
        topLeft: {
          x: invertX(detection.box.bottomRight.x, detection.imageWidth, 2 * margin),
          y: detection.box.topLeft.y + margin
        },
        topRight: {
          x: invertX(detection.box.bottomLeft.x, detection.imageWidth, -2 * margin),
          y: detection.box.topRight.y + margin
        },
        bottomRight: {
          x: invertX(detection.box.topLeft.x, detection.imageWidth, -2 * margin),
          y: detection.box.bottomRight.y - margin
        },
        bottomLeft: {
          x: invertX(detection.box.topRight.x, detection.imageWidth, 2 * margin),
          y: detection.box.bottomLeft.y - margin
        }
      };
    };

    async function detect() {
      if (video.paused || video.ended) return; // Stop detection if video is paused or ended

      // Run initial detection with full details
      const fullFaceDescription = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 288 }))
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withFaceExpressions()
        .withAgeAndGender();

      // Clear canvas in each iteration
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (fullFaceDescription) {
        const resizedResults = faceapi.resizeResults(fullFaceDescription, dims);

        // Draw important landmarks (for indexes 1, 15, 30)
        const importantLandmarks = [1, 15, 30];
        const landmarks = resizedResults.landmarks.positions;
        context.fillStyle = 'blue';
        landmarks.forEach((point, index) => {
          if (importantLandmarks.includes(index)) {
            context.beginPath();
            context.arc(point.x, point.y, 2, 0, 2 * Math.PI);
            context.fill();
            context.fillText(index, point.x + 3, point.y - 3);
          }
        });

        const point1 = landmarks[1];   // Left edge of face
        const point15 = landmarks[15]; // Right edge of face
        const point30 = landmarks[30]; // Nose tip

        const faceWidth = point15.x - point1.x;
        const noseRelativeX = (point30.x - point1.x) / faceWidth;

        // Define thresholds: centered ≈ 0.5
        if (noseRelativeX < 0.4) {
          setHeadOrientation('right'); // user's head is turned to THEIR right
        } else if (noseRelativeX > 0.6) {
          setHeadOrientation('left'); // user's head is turned to THEIR left
        } else {
          setHeadOrientation('center');
        }

        // Reset valid object state
        setValidObject({ counter: 0, alerted: false });

        const margin = 15;
        const newFaceRectangle = getInvertedFaceRectangle(resizedResults.detection);
        const smallRect = getSmallRectangle(resizedResults.detection, margin);
        const smallRectRealCoordinates = getSmallRectangleRealCoordinates(resizedResults.detection, margin);

        // Handle container scaling
        const containerDiv = document.getElementsByClassName('camera-container')?.[0];
        let responsiveSmallRectRealCoordinates = smallRectRealCoordinates;
        if (containerDiv) {
          const styles = getComputedStyle(containerDiv);
          const containerWidthFromStyles = parseFloat(styles.getPropertyValue('--main-width'));
          if (containerDiv.clientWidth < containerWidthFromStyles) {
            const scaleFactor = containerDiv.clientWidth / containerWidthFromStyles;
            responsiveSmallRectRealCoordinates = Object.fromEntries(
              Object.entries(smallRectRealCoordinates).map(([key, { x, y }]) => [
                key,
                { x: x * scaleFactor, y }
              ])
            );
          }
        }

        // Calculate circle boundaries from the circle mask element
        const circleFocus = document.getElementById('circle-mask');
        if (circleFocus) {
          const canvasRect = canvas.getBoundingClientRect();
          const circleRect = circleFocus.getBoundingClientRect();
          const circleFocusRectRealCoordinates = {
            left: circleRect.left - canvasRect.left,
            top: circleRect.top - canvasRect.top,
            right: circleRect.right - canvasRect.left,
            bottom: circleRect.bottom - canvasRect.top
          };
          const circleRectCorners = {
            topLeft: { x: circleFocusRectRealCoordinates.left, y: circleFocusRectRealCoordinates.top },
            topRight: { x: circleFocusRectRealCoordinates.right, y: circleFocusRectRealCoordinates.top },
            bottomLeft: { x: circleFocusRectRealCoordinates.left, y: circleFocusRectRealCoordinates.bottom },
            bottomRight: { x: circleFocusRectRealCoordinates.right, y: circleFocusRectRealCoordinates.bottom }
          };
          setCircleFocusBoundaryRectangle(circleRectCorners);

          // Validate if the small rectangle is inside the circle's boundaries
          const valid = containerDiv && containerDiv.clientWidth < parseFloat(getComputedStyle(containerDiv).getPropertyValue('--main-width'))
            ? isRetangleInside(circleRectCorners, responsiveSmallRectRealCoordinates)
            : isRetangleInside(circleRectCorners, smallRectRealCoordinates);
          setIsValid(valid);

          // Draw the rectangle on the canvas with color based on validity
          context.strokeStyle = valid ? 'green' : 'red';
          context.lineWidth = 2;
          context.strokeRect(
            smallRect.topLeft.x,
            smallRect.topLeft.y,
            smallRect.bottomRight.x - smallRect.topLeft.x,
            smallRect.bottomRight.y - smallRect.topLeft.y
          );

          // Update face rectangle state only if it's different from the current one
          if (areRectanglesDifferent(newFaceRectangle, faceRectangle)) {
            setFaceRectangle(newFaceRectangle);
            setAdjustedFaceRectangle(smallRect);
            setAdjustedFaceRectangleCoordinates(
              containerDiv && containerDiv.clientWidth < parseFloat(getComputedStyle(containerDiv).getPropertyValue('--main-width'))
                ? responsiveSmallRectRealCoordinates
                : smallRectRealCoordinates
            );
          } else if (areRectanglesDifferent(faceRectangle, { topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } })) {
            setFaceRectangle({ topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } });
            setAdjustedFaceRectangle({ topLeft: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 } });
          }
        }

        // Set mood/expression from the expressions object
        const expressions = resizedResults?.expressions;
        if (expressions) {
          const currentExpression = Object.entries(expressions).reduce((max, current) =>
            max[1] > current[1] ? max : current
          );
          setExpression(currentExpression);
        }

        // Update and draw age and gender information every ageUpdateInterval ms
        let ageGenderResults = fullFaceDescription;
        if (Object.entries(ageGenderResults).length) {
          const now = Date.now();
          if (now - lastAgeUpdate > ageUpdateInterval) {
            ageGenderResults = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }))
              .withAgeAndGender();
            lastAgeUpdate = now;
          }
          if (ageGenderResults) {
            const { age, gender, genderProbability } = ageGenderResults;
            const interpolatedAge = interpolateAgePredictions(age);
            const ageText = `${faceapi.utils.round(interpolatedAge, 0)} years`;
            const genderText = `${gender} (${faceapi.utils.round(genderProbability)})`;
            const textX = resizedResults.detection.box.bottomRight.x;
            const textY = resizedResults.detection.box.bottomRight.y;

            // Invert canvas for drawing text on the non-mirrored view
            context.save();
            context.scale(-1, 1);
            context.translate(-canvas.width, 0);
            context.font = '16px Arial';
            context.fillStyle = 'white';
            context.strokeStyle = 'black';
            context.lineWidth = 2;

            context.strokeText(ageText, canvas.width - textX + 2 * margin, textY);
            context.fillText(ageText, canvas.width - textX + 2 * margin, textY);
            context.strokeText(genderText, canvas.width - textX + 2 * margin, textY + margin);
            context.fillText(genderText, canvas.width - textX + 2 * margin, textY + margin);
            context.restore();
            
          }
        }
      } else {
        // Increase counter if no face is detected
        setValidObject((prev) => ({ ...prev, counter: prev.counter + 1 }));
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Continue the detection on next animation frame
      requestAnimationFrame(detect);
    }

    // Start detection if camera is shown
    if (isCameraShown) {
      detect();
    }

    // Add event listener for play event to ensure detection starts
    video.addEventListener('play', () => {
      if (isCameraShown) {
        detect();
      }
    });
  };

  
  /* Pausing video */
  const onPause = () => {
    let video = document.getElementById('video')
    video.pause()
    setIsPlaying(false)
    console.group('Face Rectangle Coordinates')
    console.log(adjustedFaceRectangleCoordinates?.topLeft, adjustedFaceRectangleCoordinates?.bottomRight)
    console.groupEnd()
    console.group('Circle Focus Boundary Rectangle')
    console.log(circleFocusBoundaryRectangle?.topLeft, circleFocusBoundaryRectangle?.bottomRight)
    console.groupEnd()
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
    adjustedFaceRectangleCoordinates,
    headOrientation
  }
}

export default useLiveness