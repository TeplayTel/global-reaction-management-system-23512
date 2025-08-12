import { render, screen } from '@testing-library/react';
import App from './App';

test('renders admin login heading', () => {
  render(<App />);
  const heading = screen.getByText(/Admin Login/i);
  expect(heading).toBeInTheDocument();
});
