import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'cta';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  fullWidth?: boolean;
};

const styles: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-indigo-600 active:bg-indigo-700',
    text: 'text-white font-semibold',
  },
  cta: {
    container: 'bg-orange-500 active:bg-orange-600',
    text: 'text-white font-bold',
  },
  secondary: {
    container: 'bg-indigo-50 border border-indigo-200 active:bg-indigo-100',
    text: 'text-indigo-700 font-semibold',
  },
  ghost: {
    container: 'active:bg-slate-100',
    text: 'text-slate-500 font-medium',
  },
  danger: {
    container: 'bg-red-500 active:bg-red-600',
    text: 'text-white font-semibold',
  },
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
}: Props) {
  const s = styles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-14 rounded-2xl items-center justify-center ${s.container} ${
        disabled || loading ? 'opacity-40' : ''
      } ${fullWidth ? 'w-full' : 'px-6'}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#6D28D9'} />
      ) : (
        <Text className={`text-base ${s.text}`}>{label}</Text>
      )}
    </Pressable>
  );
}
