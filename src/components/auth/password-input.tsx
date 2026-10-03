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
        <Text className='text-sm font-medium text-neutral-700'>{label}</Text>
      ) : null}
      <View className='relative justify-center'>
        <TextInput
          className='h-12 w-full rounded-xl border border-neutral-300 bg-white pr-14 pl-4 text-base text-neutral-900'
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor='#9ca3af'
          keyboardType='default'
          autoCapitalize='none'
          autoComplete='password'
          textContentType='password'
          secureTextEntry={!showPassword}
          {...rest}
        />
        <Pressable
          className='absolute right-4 p-1'
          hitSlop={8}
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityRole='button'
          accessibilityLabel={
            showPassword ? 'Hide password' : 'Show password'
          }>
          <Text
            className={`font-semibold ${showPassword ? 'text-blue-600' : 'text-neutral-500'}`}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>
      {error ? <Text className='text-xs text-red-500'>{error}</Text> : null}
    </View>
  );
}
