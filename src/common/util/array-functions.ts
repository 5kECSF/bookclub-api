export const removeSubArr = (mainArr: string[], arrToBeRemoved: string[]) => {
  return mainArr.filter((name) => {
    return !arrToBeRemoved.includes(name);
  });
};
