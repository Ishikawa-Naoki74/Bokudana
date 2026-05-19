import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
};

export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  hint,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [secure, setSecure] = useState(secureTextEntry);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <View
        className={`flex-row items-center h-14 px-4 rounded-2xl border bg-white ${
          focused ? 'border-violet-500' : 'border-slate-200'
        }`}
        style={{
          boxShadow: focused ? '0 0 0 3px rgba(109, 40, 217, 0.1)' : undefined,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 text-base text-slate-900"
          placeholderTextColor="#94a3b8"
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setSecure((p) => !p)} className="p-1">
            <Text className="text-sm text-slate-400">{secure ? '表示' : '隠す'}</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text className="text-xs text-slate-400 ml-1">{hint}</Text> : null}
    </View>
  );
}
