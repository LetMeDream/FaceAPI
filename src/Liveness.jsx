import './App.css'
import CameraContainer from './components/CameraContainer/CameraContainer'
import { Toaster } from 'react-hot-toast'
import useLiveness from './hooks/useLiveness'
import Accordion from './components/Accordion/Accordion'
import UploadComponent from './components/Upload/UploadComponent'

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
    successSoundRef,
    isLivenessCompleted
  } = useLiveness()

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <div className="flex flex-col md:flex-row">
        {/* Live section */}
        <section className='card border border-red-400'>
          <audio
            ref={successSoundRef}
            src="sounds/success.mp3"
            preload="auto"
          />
          {/* Cámara */}
          <CameraContainer 
            onPlay={onPlay} 
            isValid={isValid} 
          />

          {/* Botones de control */}
          <div className='flex gap-1 relative'>
            <button className='custom-btn' onClick={activateCamera}>
              Turn { isCameraShown ? 'off': 'on' } Camera
            </button>
            {/* Pause */}
            {
              isCameraShown ? (
                <button 
                  onClick={isPlaying ? onPause : onResume}
                  className='custom-btn'
                >
                  { isPlaying ? 'Pause' : 'Resume' }
                </button>
              ) : null
            }
          </div>
          
          {/* Information */}
          <Accordion
            title="Liveness Detection details"
          >
            <div className='info flex flex-col gap-2'>

                {/* Instructions */}
                <div className="mood border border-blue-100 p-4 rounded">
                  {
                    isLivenessCompleted ? (
                      <span className='text-green-500 font-bold'>
                        Liveness Detection Completed Successfully!
                      </span>
                    ) : (<span>
                      Instruction: &nbsp;
                      <span className='text-slate-500'>
                        {instructionMessage()}
                      </span> 
                    </span>)
                  }
                  
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

        </section>

        {/* Upload section */}
        {/* <section className='card basis-1/2 border border-blue-500'>
          <UploadComponent />
        </section> */}
      </div>
    </>
  )
}

export default Liveness
