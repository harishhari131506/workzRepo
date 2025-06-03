import { useState } from 'react'
import CrudFrontend from './crudSample'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <CrudFrontend/>
    </>
  )
}

export default App
