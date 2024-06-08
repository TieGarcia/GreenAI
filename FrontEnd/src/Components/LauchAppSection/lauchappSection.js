import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import { Upload, message, Progress, Image, Button } from "antd";
import { io } from "socket.io-client";
import "./launchappsection.css";
import NoteSection from "../NoteSection/NoteSection";
const { Dragger } = Upload;

const socket = io("http://localhost:5000");

function LaunchAppSection() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [uploadDisabled, setUploadDisabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frameQueue, setFrameQueue] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(null);
  const frameIntervalRef = useRef(null);

  useEffect(() => {
    socket.on("video_frame", (data) => {
      setFrameQueue((prevQueue) => [...prevQueue, `data:image/jpeg;base64,${data.image}`]);
    });

    return () => {
      socket.off("video_frame");
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!frameIntervalRef.current && frameQueue.length > 0) {
      frameIntervalRef.current = setInterval(() => {
        setFrameQueue((prevQueue) => {
          if (prevQueue.length === 0) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
            return prevQueue;
          }
          setCurrentFrame(prevQueue[0]);
          return prevQueue.slice(1);
        });
      }, 100); // Display a new frame every 0.1 second
    }
  }, [frameQueue]);

  const handleUpload = async (file) => {
    setUploadDisabled(true);
    const formData = new FormData();
    formData.append("myfile", file);

    try {
      // Clear previous states before uploading a new file
      setFrameQueue([]);
      setCurrentFrame(null);

      await axios.post(
        "http://localhost:5000/predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            setProgress(
              Math.round((progressEvent.loaded * 100) / progressEvent.total)
            );
          },
        }
      );

      message.success(`${file.name} file has been successfully uploaded.`);
    } catch (error) {
      console.error(error);
      message.error(`Failed to upload ${file.name} file.`);
    } finally {
      setUploadDisabled(false);
    }
  };

  const uploadProps = {
    name: "file",
    multiple: false,
    beforeUpload: (file) => {
      setFile(file);
      setFileName(file.name);
      return false;
    },
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };

  return (
    <div className="mainContent">
      <main>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: 'larger', fontWeight: 'bold', color: 'black', fontStyle: 'italic', textDecoration: 'none' }}>
            Instructions:
          </p>
          <ul style={{ textAlign: 'left', marginLeft: 'auto', marginRight: 'auto', maxWidth: '300px' }}>
            <li style={{ color: 'green', marginBottom: '5px' }}>1. Click or drag file to this area to upload.</li>
            <li style={{ color: 'green', fontStyle: 'italic' }}>2. After choose a image or vieo, click "Upload File" button will appear below.</li>
          </ul>
        </div>
        <Dragger {...uploadProps} className="dragBox">
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint">
            Support for uploading single or multiple files. Uploading company
            data or other prohibited files is strictly prohibited.
          </p>
        </Dragger>
        <div className="container-app">
          <div>
            {fileName && (
              <p>
                Selected File: <b>{fileName}</b>
              </p>
            )}
          </div>
          <Button
            type="primary"
            shape="round"
            icon={<DownloadOutlined />}
            size="large"
            onClick={() => handleUpload(file)}
            disabled={uploadDisabled || !file}
            style={{ display: fileName ? "block" : "none" }}
          >
            Upload File
          </Button>
        </div>
        {uploadDisabled && (
          <div className="progressContainer">
            <Progress percent={progress} status="active" />
          </div>
        )}
        <div className="imageContainer">
          {currentFrame && <Image src={currentFrame} alt="Preview" width={200} />}
        </div>
        <NoteSection />
      </main>
    </div>
  );
}

export default LaunchAppSection;
