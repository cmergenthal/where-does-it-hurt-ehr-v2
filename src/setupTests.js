// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    this.callback([
      {
        target,
        contentRect: {
          width: 800,
          height: 300,
          top: 0,
          left: 0,
          bottom: 300,
          right: 800
        }
      }
    ]);
  }

  unobserve() {}

  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
