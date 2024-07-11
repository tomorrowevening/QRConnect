function getRandomHexColor() {
  // Generate a random number between 0 and 16777215 (0xFFFFFF)
  const randomColor = Math.floor(Math.random() * 16777215);
  
  // Convert the random number to a hex string and pad with zeros if necessary
  const hexColor = `#${randomColor.toString(16).padStart(6, '0')}`;
  
  return hexColor;
}

export default class User {
  socket = undefined
  userID = ''
  color = getRandomHexColor()
  position = [
    Math.round(Math.random() * 500),
    Math.round(Math.random() * 500),
  ]

  info() {
    return {
      userID: this.userID,
      color: this.color,
      position: this.position,
    }
  }
}
