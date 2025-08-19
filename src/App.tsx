import { useState } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';

function App(): React.JSX.Element {
  const [count, setCount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsyncAction = async (): Promise<void> => {
    setIsLoading(true);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    setCount(count => count + 1);
  };

  return (
    <ErrorBoundary>
      <Layout>
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to MarketPulse
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Your comprehensive financial dashboard platform
            </p>
          </div>

          <div className="space-y-6">
            {/* Component Demo Section */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                UI Components Demo
              </h3>

              <div className="space-y-4">
                {/* Button Demo */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buttons
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setCount(count => count + 1)}>
                      Count: {count}
                    </Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button
                      variant="primary"
                      loading={isLoading}
                      onClick={handleAsyncAction}
                    >
                      Async Action
                    </Button>
                  </div>
                </div>

                {/* Input Demo */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Input
                  </h4>
                  <div className="max-w-sm">
                    <Input
                      label="Sample Input"
                      placeholder="Type something..."
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      helperText="This is a helper text"
                    />
                  </div>
                </div>

                {/* Loading Demo */}
                {isLoading && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Loading State
                    </h4>
                    <Loading text="Processing async action..." />
                  </div>
                )}
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Real-time Data
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Live market data with WebSocket connections and intelligent
                  caching.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Custom Dashboards
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create personalized dashboards with drag-and-drop widgets.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Accessibility First
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  WCAG-AA compliant with full keyboard navigation and screen
                  reader support.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Dark Mode
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Seamless theme switching with system preference detection.
                </p>
              </div>
            </div>

            {/* Development Info */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Development Status
              </h3>
              <p className="text-blue-700 dark:text-blue-200 mb-4">
                Frontend core components and infrastructure are now in place.
                Theme switching, error boundaries, and responsive design are
                functional.
              </p>
              <div className="text-sm text-blue-600 dark:text-blue-300">
                <p>✅ Base UI components created</p>
                <p>✅ Theme system implemented</p>
                <p>✅ Error boundaries active</p>
                <p>✅ Responsive layout system</p>
                <p>🔄 State management setup (Zustand)</p>
                <p>⏳ API client integration (next)</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
