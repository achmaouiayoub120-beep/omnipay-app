import type { Preview } from '@storybook/react';
import '../src/shared/tokens/theme.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'obsidian',
      values: [
        { name: 'obsidian', value: '#070A12' },
        { name: 'light', value: '#F8FAFC' },
      ],
    },
  },
};

export default preview;
