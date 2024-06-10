const hexCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'A', 'B', 'C', 'D', 'E', 'F']
const hexFieldValue = document.getElementById('hex-field-value')
const shuffleButton = document.getElementById('shuffle-button')

const rgbRField = document.getElementById('rgb-r-field')
const rgbGField = document.getElementById('rgb-g-field')
const rgbBField = document.getElementById('rgb-b-field')

// Returns a number between the range of hexCode array
function getRandomNumber() {
  return Math.floor(Math.random() * hexCodes.length)
}

// Generate a random Hex color code
function setRandomHexCode() {
  let hexColor = '#'
  for (let i = 0; i < 6; i++) {
    hexColor += hexCodes[getRandomNumber()]
  }
  return hexColor
}

// Convert a Hex code to RGB Code
function convertToRGB(hexCode) {
  // Saves the hex value of individual colors
  const red_hex = hexCode[1] + hexCode[2]
  const green_hex = hexCode[3] + hexCode[4]
  const blue_hex = hexCode[5] + hexCode[6]

  // Convert hex value to decimal
  const red = parseInt(red_hex, 16)
  const green = parseInt(green_hex, 16)
  const blue = parseInt(blue_hex, 16)

  // Updates the values on screen
  rgbRField.textContent = red
  rgbGField.textContent = green
  rgbBField.textContent = blue
}

// Applies the random color code to background color and updates the hexFieldValue value
function applyRandomColor() {
  const generatedHexCode = setRandomHexCode()
  document.body.style.backgroundColor = generatedHexCode
  hexFieldValue.textContent = generatedHexCode
  return generatedHexCode
}

// Copy Hex value to clipboard
function copyHexToClipboard() {
  // Get the text field
  const hexFieldValue = document.getElementById('hex-field-value')

  //  Copy the text
  navigator.clipboard.writeText(hexFieldValue.textContent)
}

// Copy RGB value to clipboard
function copyRGBToClipboard() {
  const rValue = rgbRField.textContent
  const gValue = rgbGField.textContent
  const bValue = rgbBField.textContent
  const stringToClipboard = rValue + ',' + gValue + ',' + bValue

  //  Copy the text
  navigator.clipboard.writeText(stringToClipboard)
}

window.onload = () => {
  convertToRGB(applyRandomColor())
}

shuffleButton.addEventListener('click', function () {
  convertToRGB(applyRandomColor())
})
