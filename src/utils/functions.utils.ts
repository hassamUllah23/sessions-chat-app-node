function hasEmptyValues(data: Record<string, any>): boolean {
  const checkEmpty = (value: any): boolean => {
    if (typeof value === "object" && value !== null) {
      return hasEmptyValues(value);
    }
    return (
      value === undefined ||
      value === null ||
      value === 0 ||
      value === "" ||
      Number.isNaN(value) ||
      (Array.isArray(value) && value.length === 0)
    );
  };

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const element = data[key];
      if (checkEmpty(element)) {
        return true;
      }
    }
  }

  return false;
}

export { hasEmptyValues };
