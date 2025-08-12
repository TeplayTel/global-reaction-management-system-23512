import { render, screen } from '@testing-library/react';
import App from './App';

test('renders admin dashboard header', () => {
  render(<App />);
  const heading = screen.getByText(/Fan Engagement Live Admin/i);
  expect(heading).toBeInTheDocument();
});
