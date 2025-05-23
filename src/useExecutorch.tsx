import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { AudioManager, AudioRecorder } from "react-native-audio-api";
import { useExecutorchModule } from "react-native-executorch";

export type ModelType = "none" | "dog" | "cat";

// CONFIGURATION
const DOG_THRESHOLD = 0.9;
const CAT_THRESHOLD = 0.9;

// Uninstall the app and install the new version if you change the AUDIO_DURATION
const AUDIO_DURATION = 3;

// Softmax function to convert logits to probabilities
const softmax = (x: number[]) => {
  const max = Math.max(...x);
  const exps = x.map((xi) => Math.exp(xi - max));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((xi) => xi / sumExps);
};

export const useExecutorch = () => {
  const model = useExecutorchModule({
    // modelSource: "https://workshops.appjs.co/ai/model_3.pte", // URL for remote model
    modelSource: require(`../model/model_${AUDIO_DURATION}.pte`),
  });

  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioBuffersRef = useRef<AudioBuffer[]>([]);

  const [probs, setProbs] = useState([0, 0, 0]);
  const [detectedClass, setDetectedClass] = useState<ModelType>("none");

  const onRecord = () => {
    if (!recorderRef.current) {
      return;
    }
    console.log("Recording started");

    recorderRef.current.onAudioReady(async (buffer) => {
      try {
        audioBuffersRef.current = audioBuffersRef.current.slice(-5);
        audioBuffersRef.current.push(buffer);

        const waveform = Float32Array.of(
          ...audioBuffersRef.current[0].getChannelData(0),
          ...audioBuffersRef.current[1].getChannelData(0),
          ...audioBuffersRef.current[2].getChannelData(0),
          ...audioBuffersRef.current[3].getChannelData(0),
          ...audioBuffersRef.current[4].getChannelData(0),
          ...audioBuffersRef.current[5].getChannelData(0)
        );

        const output = await model.forward(waveform, [
          [1, 1, AUDIO_DURATION * 16000],
        ]);
        const softmaxOutput = softmax(output[0]);
        setProbs(softmaxOutput);
        if (softmaxOutput[1] >= DOG_THRESHOLD) {
          setDetectedClass("dog");
        } else if (softmaxOutput[0] >= CAT_THRESHOLD) {
          setDetectedClass("cat");
        } else {
          setDetectedClass("none");
        }
      } catch (error) {
        console.error("Error in onAudioReady:", error);
        setDetectedClass("none");
        setProbs([0, 0, 0]);
      }
    });

    if (recorderRef.current)
      recorderRef.current.onError((error) => {
        console.log("Audio recorder error:", error);
      });

    recorderRef.current.onStatusChange((status, previousStatus) => {
      console.log("Audio recorder status changed:", status, previousStatus);
    });

    recorderRef.current.start();
  };

  useEffect(() => {
    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "spokenAudio",
      iosOptions: ["allowBluetooth", "defaultToSpeaker"],
    });

    recorderRef.current = new AudioRecorder({
      sampleRate: 16000,
      bufferLengthInSamples: 8000,
    });
    onRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.isReady]);

  useEffect(() => {
    const checkPermissions = async () => {
      const { status } = await getRecordingPermissionsAsync();
      if (status !== "granted") {
        await requestRecordingPermissionsAsync();
      }
    };
    checkPermissions();
  }, []);

  return { probs, detectedClass, isReady: model.isReady };
};
