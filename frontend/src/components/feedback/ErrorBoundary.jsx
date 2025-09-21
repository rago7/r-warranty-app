import React from "react";


export default class ErrorBoundary extends React.Component {
constructor(props) {
super(props);
this.state = { hasError: false, error: null };
}


static getDerivedStateFromError(error) {
return { hasError: true, error };
}


componentDidCatch(error, info) {
// You can wire this to monitoring later
console.error("App crashed:", error, info);
}


render() {
if (this.state.hasError) {
return (
<div className="p-6">
<h1 className="text-xl font-bold mb-1">Something went wrong.</h1>
<p className="text-slate-600">Please refresh, or contact support if it persists.</p>
</div>
);
}
return this.props.children;
}
}