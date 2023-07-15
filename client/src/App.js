import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button, Card, CardContent, Typography } from '@material-ui/core';
import axios from 'axios';

// Replace with your contract's ABI
const contractABI = [
  // put your contract's ABI here
];

// Twitter Bearer Token (Should be securely stored)
const BEARER_TOKEN = 'Bearer YOUR_TWITTER_BEARER_TOKEN';

// Contract Address
const contractAddress = 'YOUR_CONTRACT_ADDRESS';

// Replace with your Ethereum provider link
const provider = new ethers.providers.JsonRpcProvider('YOUR_ETHEREUM_PROVIDER_LINK');

const contract = new ethers.Contract(contractAddress, contractABI, provider);

function App() {
  const [candidates, setCandidates] = useState([]);
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    async function fetchCandidates() {
      const candidatesCount = await contract.candidatesCount();
      let newCandidates = [];

      for (let i = 1; i <= candidatesCount; i++) {
        const candidate = await contract.candidates(i);
        const twitterUser = await lookupTwitterUser(candidate.name);

        newCandidates.push({
          id: i,
          name: candidate.name,
          voteCount: candidate.voteCount.toNumber(),
          profileImage: twitterUser.profile_image_url,
          profileBanner: twitterUser.profile_banner_url,
        });
      }

      setCandidates(newCandidates);
    }

    fetchCandidates();

    // Automatically updates the UI every 3 minutes
    const interval = setInterval(() => {
      fetchCandidates();
    }, 180000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, []);

  async function lookupTwitterUser(username) {
    const response = await axios.get(`https://api.twitter.com/2/users/by/username/${username}`, {
      headers: {
        'Authorization': BEARER_TOKEN
      }
    });

    return response.data.data;
  }

  async function connectWallet() {
    if (window.ethereum) {
      window.ethereum.enable();

      const userAddress = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(userAddress[0]);
    } else {
      alert('Please install MetaMask!');
    }
  }

  async function voteForCandidate(candidateId) {
    if (walletAddress) {
      const signer = provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const transaction = await contract.vote(candidateId);

      await transaction.wait();
      alert('You voted successfully!');
      // Refresh candidates
      const updatedCandidates = [...candidates];
      const candidate = updatedCandidates.find(candidate => candidate.id === candidateId);
      candidate.voteCount++;
      setCandidates(updatedCandidates);
    } else {
      alert('You need to connect your Ethereum wallet!');
    }
  }

  return (
    <div className="App">
      <Button variant="contained" color="primary" onClick={connectWallet}>Connect Wallet</Button>
      {candidates.slice(0, 3).map((candidate) => (
        <Card key={candidate.id} style={{ margin: '10px auto', maxWidth: '400px' }}>
          <CardContent>
            <Typography variant="h5" component="h2">{candidate.name}</Typography>
            <img src={candidate.profileImage} alt="profile" />
            <Typography color="textSecondary">{candidate.voteCount} votes</Typography>
            <Button variant="contained" color="primary" onClick={() => voteForCandidate(candidate.id)}>Vote</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default App;
