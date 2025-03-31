
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