const tf = require('@tensorflow/tfjs');

const models = {};
let last = { age: 0, gender: '' };
let frame = 0;

async function getImage(image, size) {
  const tensor = tf.tidy(() => {
    const buffer = tf.browser.fromPixels(image);
    const resize = tf.image.resizeBilinear(buffer, [size, size]);
    const expand = tf.cast(tf.expandDims(resize, 0), 'float32');
    // const normalize = tf.mul(expand, [1.0 / 1.0]);
    return expand;
  });
  return tensor;
}

async function predict(image, config) {
  frame += 1;
  if (frame >= config.face.age.skipFrames) {
    frame = 0;
    return last;
  }
  if (!models.age && config.face.age.enabled) models.age = await tf.loadGraphModel(config.face.age.modelPath);
  if (!models.gender && config.face.gender.enabled) models.gender = await tf.loadGraphModel(config.face.gender.modelPath);
  let enhance;
  if (image instanceof tf.Tensor) {
    const resize = tf.image.resizeBilinear(image, [config.face.age.inputSize, config.face.age.inputSize], false);
    enhance = tf.mul(resize, [255.0]);
    tf.dispose(resize);
  } else {
    enhance = await getImage(image, config.face.age.inputSize);
  }
  const obj = {};
  if (config.face.age.enabled) {
    const ageT = await models.age.predict(enhance);
    obj.age = Math.trunc(10 * ageT.dataSync()[0]) / 10;
    tf.dispose(ageT);
  }
  if (config.face.gender.enabled) {
    const genderT = await models.gender.predict(enhance);
    obj.gender = Math.trunc(100 * genderT.dataSync()[0]) < 50 ? 'female' : 'male';
    tf.dispose(genderT);
  }
  tf.dispose(enhance);
  last = obj;
  return obj;
}

exports.predict = predict;
