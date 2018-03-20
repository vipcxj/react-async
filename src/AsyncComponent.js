/* eslint-disable no-shadow */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isPromise from 'is-promise';
import { some, toPairs, fromPairs, isFunction } from './utils';

const DefaultLoadingComponent = () => null;
const DefaultErrorComponent = () => null;

const version = React.version;
const majorVersion = version ? Number.parseInt(version.slice(0, version.indexOf('.'))) : 0;

class AsyncComponent extends Component {
    static updateResolvedProps = resolvedProps => preState => ({
        resolvedProps: {
            ...preState.resolvedProps,
            ...resolvedProps,
        },
        progress: {
            ...preState.progress,
            ...fromPairs(Object.keys(resolvedProps).map(k => [k, 1])),
        }
    });
    constructor(props, ...args) {
        super(props, ...args);
        this.errorComponent = null;
        this.state = {
            error: null,
            loading: true,
            resolvedProps: {},
            progress: fromPairs(Object.keys(props.asyncProps || {}).map(k => [k, 0])),
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.load();
    }

    componentWillUnmount() {
        this.mounted = false;
    }
    updateProgress = propName => progress => this.setState({
        progress: {
            ...this.state.progress,
            [propName]: progress,
        },
    });

    load() {
        let pairs = toPairs(this.props.asyncProps || {})
            .filter(entry => entry[1]);
        if (some(pairs, entry => !isFunction(entry[1]))) {
            this.setState({
                error: new Error('The prop of asyncProps must be a function.'),
                loading: false,
            });
            return;
        }
        const { batch } = this.props;
        pairs = pairs.map(([k, v]) => ([k, v(this.updateProgress(k))]));
        if (some(pairs, pair => isPromise(pair[1]))) {
            const promises = pairs.map(([k, p]) => {
                if (isPromise(p)) {
                    return p.then((res) => {
                        if (!batch) {
                            if (this.mounted) {
                                this.setState(AsyncComponent.updateResolvedProps({
                                    [k]: res,
                                }));
                            } else {
                                this.state.resolvedProps[k] = res;
                                this.state.progress[k] = 1;
                            }
                        }
                        return [k, res];
                    });
                }
                return [k, p];
            });
            Promise.all(promises).then((pairs) => {
                if (this.mounted) {
                    this.setState({
                        resolvedProps: fromPairs(pairs),
                        progress: fromPairs(pairs.map(([k]) => [k, 1])),
                        error: null,
                    });
                } else {
                    this.state.resolvedProps = fromPairs(pairs);
                    this.state.progress = fromPairs(pairs.map(([k, v]) => [k, 1]));
                    this.state.error = null;
                }
            }).catch((e) => {
                if (this.mounted) {
                    this.setState({
                        error: e,
                    });
                } else {
                    this.state.error = e;
                }
            }).finally(() => {
                if (this.mounted) {
                    this.setState({
                        loading: false,
                    });
                } else {
                    this.state.loading = false;
                }
            });
        }
    }

    render() {
        const {
            errorComponent: ErrorComponent,
            loadingComponent: LoadingComponent,
            component: Comp,
            children, // eslint-disable-line react/prop-types
        } = this.props;
        const { error, loading, resolvedProps, progress } = this.state;
        const { children: ignored, ...restResolvedProps } = resolvedProps;
        if (loading) {
            return <LoadingComponent {...this.props} {...restResolvedProps} progress={progress} />;
        }
        if (error) {
            return <ErrorComponent {...this.props} {...restResolvedProps} progress={progress} error={error} />;
        }
        if (Comp) {
            return <Comp {...this.props} {...resolvedProps} progress={progress} />;
        }
        // noinspection JSUnresolvedFunction JSCheckFunctionSignatures
        const newChildren = React.Children
            .map(children, child => React.cloneElement(child, restResolvedProps));
        if (newChildren.length === 1) {
            return newChildren[0];
        } else if (newChildren.length > 1) {
            return majorVersion >= 16 ? newChildren : <div> {newChildren} </div>;
        }
        return null;
    }
}

const {
    bool,
    object,
    func,
    oneOfType,
    arrayOf,
    element,
} = PropTypes;

// noinspection JSUnresolvedVariable
AsyncComponent.propTypes = {
    batch: bool,
    // eslint-disable-next-line react/forbid-prop-types
    asyncProps: object.isRequired,
    component: func,
    children: oneOfType([element, arrayOf(element)]),
    errorComponent: func,
    loadingComponent: func,
};

AsyncComponent.defaultProps = {
    batch: false,
    component: null,
    children: null,
    errorComponent: DefaultErrorComponent,
    loadingComponent: DefaultLoadingComponent,
};

export default AsyncComponent;
