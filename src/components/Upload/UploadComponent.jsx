import styled from "styled-components"
import imgIconSource from '../../assets/camera-icon.svg'

const FileButton = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 300px;
  height: 200px;
  border-radius: 10px;
  cursor: pointer;
`;

export const InputFile = styled.input.attrs({ type: 'file' })`
  width: 100%;
  height: 100%;
  position: absolute;
  opacity: 0;
  z-index: 100;
  cursor: pointer;

  &:hover,
  &:focus {
    cursor: pointer;
  }
  user-select: none;

`;

const FileVideo = styled.video`
  width: 100%;
  height: 100%;
  padding: 10px;
  display: none
`;

const FileIcon = styled.img`
  max-width: 50%;
  max-height: 100%;
  height: 100%;
  color: white;
  padding: 10px;
  `;

const onChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    let error = false

    /* Eval for error */
    const reader = new FileReader();

    reader.read

    if (!error) {
      let icon = document.getElementById('file-icon');
      icon.src = URL.createObjectURL(file);
    }


  }
}

const UploadComponent = () => {
  return (
    <div className="w-full mb-3 p-4 rounded-md border">
      <div className="flex flex-col justify-center items-center">
        <FileButton
          className="border border-yellow-300"
        >
          <InputFile
            // accept={ accept }
            onChange={ onChange }
          />


          <FileIcon 
            src={imgIconSource}
            id='file-icon'
          />

        </FileButton>
        <p className="flex flex-col">
          'mp4/x-m4v/quicktime/3gpp'
        </p>

      </div>
        {/* {errors?.[uniqueName]?.message && (
          <Error message={ errors[uniqueName].message } />
        )} */}
    </div>
  )
}

export default UploadComponent