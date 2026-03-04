// Static site - no React needed
// This file exists only to satisfy react-scripts
const rootElement = document.getElementById('root');
if (rootElement) {
    import('react').then(React => {
        import('react-dom/client').then(ReactDOM => {
            const root = ReactDOM.createRoot(rootElement);
            root.render(React.createElement('div', null, 'DISTRIAI'));
        });
    });
}
