import { useState } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  error?: string;
  label?: string;
};

export default function PasswordInput({
  error,
  label = 'Password',
  value,
  onChangeText,
  onBlur,
  placeholder = 'Enter password',
  ...rest
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className='gap-1.5'>
      {label ? (
        <Text className='text-xs font-semibold uppercase tracking-wider text-slate-600'>{label}</Text>
      ) : null}
      <View className='relative justify-center'>
        <TextInput
          className='h-12 w-full rounded-xl border border-slate-200 bg-white pr-14 pl-4 text-sm font-medium text-slate-900 shadow-xs'
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor='#94a3b8'
          keyboardType='default'
          autoCapitalize='none'
          autoComplete='password'
          textContentType='password'
          secureTextEntry={!showPassword}
          {...rest}
        />
        <Pressable
          className='absolute right-4 p-1 active:opacity-70'
          hitSlop={8}
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityRole='button'
          accessibilityLabel={
            showPassword ? 'Hide password' : 'Show password'
          }>
          <Text
            className={`text-xs font-bold ${showPassword ? 'text-indigo-600' : 'text-slate-400'}`}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>
      {error ? <Text className='text-xs font-medium text-rose-500'>{error}</Text> : null}
    </View>
  );
}
