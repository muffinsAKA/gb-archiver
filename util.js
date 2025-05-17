export const trimInput = (input) => {
    return input.trim().replace(/\s/g, "")
}

export const getApiDate = () => {
  const date = new Date();
  const formattedDate = date.toISOString().slice(0, 10);
  // const formattedDate = "2025-05-12";
  return formattedDate;
};