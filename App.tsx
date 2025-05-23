import React from "react";
import { SafeAreaView, Text } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { useExecutorch } from "./src/useExecutorch";

export default function App() {
  const { detectedClass, probs } = useExecutorch();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
    >
      <Svg height="200" width="300">
        {probs.map((prob, index) => (
          <React.Fragment key={index}>
            <Rect
              x={index * 100 + 20}
              y={200 - prob * 200}
              width={60}
              height={prob * 200}
              fill={["red", "green", "blue"][index]}
            />
            <SvgText
              x={index * 100 + 50}
              y={190}
              fontSize="16"
              fill="white"
              textAnchor="middle"
            >
              {["Cat", "Dog", "None"][index]}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
      <Text
        style={{ fontSize: 24, color: "white", marginTop: 20 }}
      >{`Detected: ${detectedClass}`}</Text>
    </SafeAreaView>
  );
}
