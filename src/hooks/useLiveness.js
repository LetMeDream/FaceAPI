import * as faceapi from 'face-api.js'
import { useState, useEffect, useRef } from 'react'
import { interpolateAgePredictions, isRetangleInside, areRectanglesDifferent, getInvertedFaceRectangle, getSmallRectangle, getSmallRectangleRealCoordinates } from '../helpers/liveness'
import toast from 'react-hot-toast'
import { calculateOrientation } from '../helpers/liveness'
import useSound from 'use-sound'
import successSound from '../assets/sounds/success.mp3'

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
  const [isValid, setIsValid] = useState(false) // 'inside' || 'outside'
  const [validObject, setValidObject] = useState({ // Object to handle the alert when no face is detected
    /* Counter for counting the number of frames without face detected */
    counter: 0,
    alerted: false
  })
  const [headOrientation, setHeadOrientation] = useState('center'); // State for storing head orientation
  const [detection, setDetection] = useState(null); // State for storing the detection result

  const [, setFaceInsideRectangle] = useState(null)

  /* Sound */
  const [playSuccessSound] = useSound(successSound);

  const handleCompletition = () => {
    // Logic for your liveness detection step completion
    console.log("Step completed!")
    setIsLivenessCompleted(true)
    playSuccessSound()
  };

  const resetLivenessDetection = () => {
    setTimeout(() => {
      setStepIndex(0)
      setInstruction(steps[0]?.instruction)
      setIsLivenessCompleted(false)
    }, 100);
  }

  /* Expression */
  const [expression, setExpression] = useState(null)
  /* Ages */

  let lastAgeUpdate = Date.now();
  const ageUpdateInterval = 1000;

  /* UseEffect for handling validation when no face detected */
  useEffect(() => {
    // console.log(validObject.counter);
    if (validObject.counter > 200 && !validObject.alerted) {
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


  const activateCamera = async () => {
    let canvas = document.getElementById('overlay')
    let context = canvas.getContext('2d')
    setIsValid(false)

    setTimeout(() => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }, 50);
    resetLivenessDetection()
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
        // video.onplay = onPlay
      } catch (error) {
        console.error(error)
        toast.error(error?.message)
      }
    } else {
      setIsCameraShown(false)
      setIsPlaying(false)
      setExpression(null)
      let video = document.getElementById('video')
      let stream = video?.srcObject
      let tracks = stream?.getTracks()
  
      tracks?.forEach(track => {
        track?.stop()
      })
      

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
    setStepIndex(0)
    setInstruction(steps[0])

    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay');
    if (!video || !canvas) return;
    const context = canvas.getContext('2d');
    const dims = faceapi.matchDimensions(canvas, video, true);

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
        // * Logic for Drawing Face on the UploadComponent
        // * It wasnt working.
        /* const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        let icon = document.getElementById('file-icon');
        if (icon) {
          icon.src = dataURL; // Update the icon with the current frame
        } */
        setDetection(resizedResults); // Store detection result

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

        const orientation = calculateOrientation(resizedResults)

        // Define thresholds: centered ≈ 0.5
        if (orientation?.right) {
          setHeadOrientation('right'); // user's head is turned to THEIR right
        } else if (orientation?.left) {
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
            responsiveSmallRectRealCoordinates = Object.fromEntries( /* Bug possible place; check */
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

          setFaceInsideRectangle(valid ? 'inside' : 'outside');

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
        // context.clearRect(0, 0, canvas.width, canvas.height);
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
    resetLivenessDetection()

    let video = document.getElementById('video')
    video.play()
    setIsPlaying(true)
  }

  /* Liveness check */
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    {
      instruction: 'Mira al frente', // "Look straight ahead"
      // The function that checks if the 'Look straight ahead' condition is met
      checkCondition: (detection) => calculateOrientation(detection, 0.45, 0.55)?.center
    },
    {
      instruction: 'Gira la cabeza a la izquierda', // "Turn head left"
      // The function that checks if the 'Turn head left' condition is met
      checkCondition: (detection) => calculateOrientation(detection, undefined, 0.7)?.left
    },
    {
      instruction: 'Gira la cabeza a la derecha', // "Turn head right"
      // The function that checks if the 'Turn head right' condition is met
      checkCondition: (detection) => calculateOrientation(detection, 0.3)?.right
    },
    {
      instruction: 'Sonríe', // "Smile"
      // The function that checks if the 'Smile' condition is met
      checkCondition: (detection) => detection?.expressions?.happy > 0.7 // Added optional chaining for safety
    },
    {
      instruction: 'Finalizado', // "Finished"
      // For the 'Finished' step, the condition is always false to prevent automatic advancement
      checkCondition: () => false
    }
  ];
  const [instruction, setInstruction] = useState(steps[stepIndex]?.instruction);
  const [isIntructionStarted, setIsIntructionStarted] = useState(false)
  const [isLivenessCompleted, setIsLivenessCompleted] = useState(false)

  const toastShownForStepRef = useRef(null);
  // * Actual LIVENESS DETECTION 
  useEffect(() => {  
     // Ensure detection is valid, instruction has started, there's a 'detection' object, the index is valid and it hasn't completed the liveness check
    if (isValid && isIntructionStarted && detection && stepIndex < (steps.length - 1) && !isLivenessCompleted) {    

      // Get the current step object
      const currentStep = steps[stepIndex];
      let satisfied = false;

      // Check if the current step has a checkCondition function and execute it
      if (currentStep && typeof currentStep.checkCondition === 'function') {
        try {
          satisfied = currentStep.checkCondition(detection);
        } catch (error) {
           console.error("Error evaluating condition for step:", currentStep.instruction, error);
           satisfied = false
        }
      } else {
        console.warn("No checkCondition function found for step:", currentStep?.instruction);
      }

      // If the current step's condition is met...
      if (satisfied) {
        if (stepIndex === steps.length - 2) handleCompletition()

        const nextStepIndex = stepIndex + 1;
        if ((nextStepIndex < (steps.length - 1)) && isValid) { // Check if there is a next step
          if (toastShownForStepRef.current !== stepIndex) {
            toastShownForStepRef.current = stepIndex;

            toast.success('Great!🎉 Keep going!', {
              position: "top-center",
              autoClose: 3000,
              closeOnClick: false,
              pauseOnHover: true,
              draggable: true,
              theme: "light",
              id: `step-toast-${stepIndex}`
            });

            setTimeout(() => {
              setStepIndex(nextStepIndex);
              // clear guard so future steps can show toasts again
              toastShownForStepRef.current = null;
            }, 333);
          }
        } else {
          // This was the last step (excluding 'Finalizado' logic if handled differently)
          console.log("Liveness check sequence completed!");
          setIsLivenessCompleted(true)
          setTimeout(() => {
            onPause()
          }, 300)
      }
      }
    }
  }, [detection, instruction, steps.length, isValid]);
  
  /* In order to delay the start of the guided instructions */
  useEffect(() => {
    setTimeout(() => {
      if(stepIndex === 0) setIsIntructionStarted(true)
    }, 1000)
  }, [stepIndex, isPlaying])

  const instructionMessage = () => {
    return steps[stepIndex]?.instruction || steps[stepIndex];
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
    headOrientation,
    instruction,
    instructionMessage,
    isLivenessCompleted
  }
}

export default useLiveness