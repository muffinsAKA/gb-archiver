export const trimInput = (input) => {
  return input.trim().replace(/\s/g, '')
}

export const getApiDate = () => {
  const date = new Date()
  date.setDate(date.getDate() - 2)
  const formattedDate = date.toLocaleDateString('en-US')
  return formattedDate
}
