import * as React from 'react';
import { useLayoutEffect, useRef } from 'react';
import { connect, ReactReduxContext } from 'react-redux';
import { Store } from 'redux';
import { reduxAdapter } from '@cloudsop/horizon';
import { History, Location, Router } from '../router';
import { Action, DefaultStateType, Navigation } from '../history/types';
import { ActionMessage, onLocationChanged } from './actions';
import stateReader from './reduxUtils';

type StoreType = 'HorizonXCompat' | 'Redux';

type ConnectedRouter<S> = {
  store: Store;
  history: History<S>;
  basename: string;
  children?: (() => React.ReactNode) | React.ReactNode;
  onLocationChanged: (location: Location<S>, action: Action, isFirstRendering: boolean) => ActionMessage;
  noInitialPop: boolean;
  omitRouter: boolean;
  storeType: StoreType;
};

const { connect: hConnect } = reduxAdapter;

function ConnectedRouterWithoutMemo<S>(props: ConnectedRouter<S>) {
  const { store, history, onLocationChanged, omitRouter, children, storeType } = props;
  const { getLocation } = stateReader(storeType);

  // 监听store变化
  const unsubscribe = useRef<null | (() => void)>(
    store.subscribe(() => {
      // 获取redux State中的location信息
      const {
        pathname: pathnameInStore,
        search: searchInStore,
        hash: hashInStore,
        state: stateInStore,
      } = getLocation<S>(store.getState());

      // 获取当前history对象中的location信息
      const {
        pathname: pathnameInHistory,
        search: searchInHistory,
        hash: hashInHistory,
        state: stateInHistory,
      } = history.location;

      // 两个location不一致 执行跳转
      if (
        history.action === 'PUSH' &&
        (pathnameInHistory !== pathnameInStore ||
          searchInHistory !== searchInStore ||
          hashInHistory !== hashInStore ||
          stateInHistory !== stateInStore)
      ) {
        history.push(
          {
            pathname: pathnameInStore,
            search: searchInStore,
            hash: hashInStore,
          },
          stateInStore,
        );
      }
    }),
  );

  const handleLocationChange = (args: Navigation<S>, isFirstRendering: boolean = false) => {
    const { location, action } = args;
    onLocationChanged(location, action, isFirstRendering);
  };

  // 监听history更新
  const unListen = useRef<null | (() => void)>(history.listen(handleLocationChange));

  useLayoutEffect(() => {
    return () => {
      unListen.current && unListen.current();
      unsubscribe.current && unsubscribe.current();
    };
  }, []);

  if (!props.noInitialPop) {
    // 传递初始时位置信息，isFirstRendering设为true防止重复渲染
    handleLocationChange({ location: history.location, action: history.action }, true);
  }

  if (omitRouter) {
    return <>{children}</>;
  }
  let childrenNode: React.ReactNode;
  if (typeof children === 'function') {
    childrenNode = children();
  } else {
    childrenNode = children;
  }

  return <Router history={history}>{childrenNode}</Router>;
}

function getConnectedRouter<S = DefaultStateType>(type: StoreType) {
  const mapDispatchToProps = (dispatch: any) => ({
    onLocationChanged: (location: Location, action: Action, isFirstRendering: boolean) =>
      dispatch(onLocationChanged(location, action, isFirstRendering)),
  });
  const ConnectedRouter = React.memo(ConnectedRouterWithoutMemo<S>);

  const ConnectedRouterWithContext = (props: any) => {
    const Context = props.context || ReactReduxContext;

    return (
      <Context.Consumer>
        {({ store }: any) => <ConnectedRouter store={store} storeType={type} {...props} />}
      </Context.Consumer>
    );
  };

  // 针对不同的Store类型，使用对应的connect函数
  if (type === 'HorizonXCompat') {
    return hConnect(null, mapDispatchToProps)(ConnectedRouterWithContext);
  }
  if (type === 'Redux') {
    return connect(null, mapDispatchToProps)(ConnectedRouterWithContext);
  } else {
    throw new Error('Invalid store type');
  }
}

export { getConnectedRouter };