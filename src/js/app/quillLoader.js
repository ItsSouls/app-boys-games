let quillLoader;

export const loadQuill = async () => {
  if (!quillLoader) {
    quillLoader = import('quill').then((mod) => mod.default || mod);
  }
  return quillLoader;
};
