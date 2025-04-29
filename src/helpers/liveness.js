
/* Helper function, rounding age for better approximation */
export function interpolateAgePredictions(age, predictedAges = []) {
  predictedAges = [age].concat(predictedAges).slice(0, 30)
  const avgPredictedAge = predictedAges.reduce((total, a) => total + a) / predictedAges.length
  return avgPredictedAge
}

/* Helper function. Helps us calculate whether one box is inside another */
export function isRetangleInside(biggerRectangle, smallerRectangle) {
  // Comprobar si el smallerRectangle está completamente dentro del biggerRectangle
  const dentroDeCuadro1 =
    smallerRectangle.topLeft.x >= biggerRectangle.topLeft.x &&
    smallerRectangle.topLeft.y >= biggerRectangle.topLeft.y &&
    smallerRectangle.topRight.x <= biggerRectangle.topRight.x &&
    smallerRectangle.topRight.y >= biggerRectangle.topRight.y &&
    smallerRectangle.bottomRight.x <= biggerRectangle.bottomRight.x &&
    smallerRectangle.bottomRight.y <= biggerRectangle.bottomRight.y &&
    smallerRectangle.bottomLeft.x >= biggerRectangle.bottomLeft.x &&
    smallerRectangle.bottomLeft.y <= biggerRectangle.bottomLeft.y;

  return dentroDeCuadro1;
}

/* Compare coordinates of the corners of two rectangles */
export const areRectanglesDifferent = (rect1, rect2) => {
  return (
    rect1.topLeft.x !== rect2.topLeft.x ||
    rect1.topLeft.y !== rect2.topLeft.y ||
    rect1.bottomRight.x !== rect2.bottomRight.x ||
    rect1.bottomRight.y !== rect2.bottomRight.y
  )
}

// Utility: Transform detection box coordinates.
export const getInvertedFaceRectangle = (detection) => {
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
export const getSmallRectangle = (detection, margin) => {
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
export const getSmallRectangleRealCoordinates = (detection, margin) => {
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

/* Calculate Orientation */
export const calculateOrientation = (detection) => {
  const orientation = {
    left: false,
    right: false,
    center: false
  }
  const importantLandmarks = [1, 15, 30];
  const landmarks = detection.landmarks.positions;

  const point1 = landmarks[1];   // Left edge of face
  const point15 = landmarks[15]; // Right edge of face
  const point30 = landmarks[30]; // Nose tip

  const faceWidth = point15.x - point1.x;
  const noseRelativeX = (point30.x - point1.x) / faceWidth;

  if ((noseRelativeX < 0.4)) {
    orientation.right = true;
  } else if ((noseRelativeX > 0.6)) {
    orientation.left = true;
  } else {
    orientation.center = true;
  }

  return orientation

}

/* LOCAL UTILITIES */

// Utility: Invert an x coordinate given the image width.
const invertX = (x, imageWidth, offset = 0) => {
  return imageWidth - x + offset;
};