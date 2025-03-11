import { createContext, JSX, useContext } from 'solid-js'

const WTFContext = createContext<'wtf'>()

export function WTFProvider(props: { children: JSX.Element }) {
  return <WTFContext.Provider value={'wtf'}>{props.children}</WTFContext.Provider>
}

export function useWTF() {
  const context = useContext(WTFContext)

  console.log('🚀 ~ useWTF ~ context:', context)

  if (!context) {
    throw new Error('useWTF must be used within a DrizzleProvider')
  }

  return context
}
