import './App.css'
import CameraContainer from './components/CameraContainer/CameraContainer'
import { Toaster } from 'react-hot-toast'
import useLiveness from './hooks/useLiveness'
import Accordion from './components/Accordion/Accordion'


function Liveness() {
  const {
    onPlay,
    onPause,
    onResume,
    isValid,
    activateCamera,
    isCameraShown,
    isPlaying,
    expression,
    adjustedFaceRectangleCoordinates,
    headOrientation,
    instructionMessage,
    successSoundRef
  } = useLiveness()

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <div className="card">
        <audio
          ref={successSoundRef}
          src="sounds/success.mp3"
          preload="auto"
        />
        <CameraContainer 
          onPlay={onPlay} 
          isValid={isValid} 
        />

        <div className='flex gap-1'>
          <button className='custom-btn' onClick={activateCamera}>
            Turn { isCameraShown ? 'off': 'on' } Camera
          </button>
          {
            isCameraShown ? (
              <button onClick={isPlaying ? onPause : onResume}>
                { isPlaying ? 'Pause' : 'Resume' }
              </button>
            ) : null
          }
        </div>
        
        <Accordion
          title="Liveness Detection details"
        >
          <div className='info flex flex-col gap-2'>

              <div className="mood border border-blue-100 p-4 rounded">
                <span>
                  Instruction: &nbsp;
                  <span className='text-slate-500'>
                    {instructionMessage()}
                  </span> 
                </span>
              </div>

              <div className='flex gap-2'>

                <div className="mood border border-blue-100 p-4 rounded">
                  <span>
                    Head direction: &nbsp;
                    <span className='text-slate-500'>
                      {headOrientation}
                    </span> 
                  </span>
                </div>

                <div className="mood border border-blue-100 p-4 rounded">
                  <span>
                    Current Mood: &nbsp;
                    <span className='text-slate-500'>
                      {expression?.[0] || ''}
                    </span> 
                  </span>
                </div>
              
              </div>

              <div className="mood border border-blue-100 p-4 rounded">
                <span>
                  Status: &nbsp;
                  <span className='text-slate-500'>
                    {isValid ? 'Valid' : 'Invalid'}
                  </span> 
                </span>
              </div>

              <div className="mood border border-blue-100 p-4 rounded flex items-center">
                Current Position: &nbsp;
                <span className='text-slate-500 flex flex-col items-start gap-1 text-sm'>
                  <div className="topValues w-full flex">
                    
                    <div className='w-full'>
                      <span className='flex items-center justify-around w-full'>
                        <span>
                          TopLeft:
                        </span>
                        <span className='text-red-400 text-sm flex flex-col'>
                          <div className='text-nowrap'>
                            X: { Math.trunc(adjustedFaceRectangleCoordinates?.topLeft?.x) || '' }
                          </div>
                          <div className='text-nowrap'>
                            Y: { Math.trunc(adjustedFaceRectangleCoordinates?.topLeft?.y) || '' }
                          </div>
                        </span>
                      </span>
                    </div>
                    <div className='w-full'>
                      <span className='flex items-center justify-around w-full'>
                        <span>
                          TopRight:
                        </span>
                        <span className='text-red-400 text-sm flex flex-col'>
                          <div className=' w text-nowrap'>
                            X: { Math.trunc(adjustedFaceRectangleCoordinates?.topRight?.x) || '' }
                          </div>
                          <div className=' w text-nowrap'>
                            Y: { Math.trunc(adjustedFaceRectangleCoordinates?.topRight?.y) || '' }
                          </div>
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="bottomValues w-full flex text-nowrap">

                    <div className='w-full'>
                      <span className='flex items-center justify-around w-full'>
                        <span>
                          BottomLeft:
                        </span>
                        <span className='text-red-400 text-sm flex flex-col'>
                          <span>
                            X: { Math.trunc(adjustedFaceRectangleCoordinates?.bottomLeft?.x) || '' }
                          </span>
                          <span>
                            Y: { Math.trunc(adjustedFaceRectangleCoordinates?.bottomLeft?.y) || '' }
                          </span>
                        </span>
                      </span>
                    </div>

                    <div className='w-full'>
                      <span className='flex items-center justify-around w-full'>
                        <span>
                          BottomRight:
                        </span>
                        <span className='text-red-400 text-sm flex flex-col'>
                          <span>
                            X: { Math.trunc(adjustedFaceRectangleCoordinates?.bottomRight?.x) || '' }
                          </span>
                          <span>
                            Y: { Math.trunc(adjustedFaceRectangleCoordinates?.bottomRight?.y) || '' }
                          </span>
                        </span>
                      </span>
                    </div>
                  </div>



                </span> 
              </div>
          </div>
        </Accordion>
      </div>
    </>
  )
}

export default Liveness
