import { useEffect, useState, type ReactNode } from 'react';

type State<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; items: T[] };

type Props<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  loadItems: () => Promise<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyMessage, loadItems, renderItem }: Props<T>) {
  const [state, setState] = useState<State<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    loadItems().then(
      (items) => {
        if (active) setState({ status: 'success', items });
      },
      () => {
        if (active) setState({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [loadItems]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
        {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}. Please try again.</p>}
        {state.status === 'success' && state.items.length === 0 && <p role="status">{emptyMessage}</p>}
        {state.status === 'success' && state.items.length > 0 && (
          <>
            <p role="status">{title} loaded successfully.</p>
            <ul className="list-group">
              {state.items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item, index)}</li>)}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
